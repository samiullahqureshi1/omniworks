'use server';

import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { hashPassword, verifyPassword, createSession, destroySession, getSession } from '@/lib/auth';

/**
 * Create the session for a freshly authenticated user, but restore the org they
 * last switched to (persisted in the `omniwork_last_org` cookie) when they still
 * have access to it:
 *   - member/shared org  -> re-issue the session as that org's user identity
 *   - child/owned org     -> base identity + active-org override cookie
 * Falls back to the user's own org.
 */
async function establishSessionWithLastOrg(baseUser: {
  id: string; email: string; name: string; role: any; organizationId: string;
}) {
  const cookieStore = await cookies();
  const lastOrg = cookieStore.get('omniwork_last_org')?.value;

  if (lastOrg && lastOrg !== baseUser.organizationId) {
    const membership = await prisma.user.findFirst({
      where: { email: baseUser.email, organizationId: lastOrg, status: 'ACTIVE' },
      select: { id: true, email: true, name: true, role: true, organizationId: true },
    });
    if (membership) {
      await createSession(membership);
      cookieStore.delete('omniwork_active_org');
      return;
    }

    const child = await prisma.organization.findFirst({
      where: {
        id: lastOrg,
        OR: [{ ownerUserId: baseUser.id }, { parentOrganizationId: baseUser.organizationId }],
      },
      select: { id: true },
    });
    if (child) {
      await createSession(baseUser);
      cookieStore.set('omniwork_active_org', lastOrg, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return;
    }
  }

  await createSession(baseUser);
}

export async function signupAction(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const companyName = formData.get('companyName') as string;

    if (!name || !email || !password || !companyName) {
      return { error: 'All fields are required.' };
    }

    // Check if user already exists as an owner of any organization?
    // Wait, if they sign up again with same email, we shouldn't let them if they already exist globally
    // We can just findFirst
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return { error: 'User with this email already exists. Log in and create an organization from the dashboard instead.' };
    }

    // Create organization first (without ownerUserId)
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
    let org = await prisma.organization.create({
      data: {
        name: companyName,
        slug,
      },
    });

    // Create default project and task stages
    const defaultStages = [
      { name: 'To Do', color: '#64748b', order: 0 },
      { name: 'In Progress', color: '#eab308', order: 1 },
      { name: 'In Review', color: '#a855f7', order: 2 },
      { name: 'Completed', color: '#22c55e', order: 3 },
    ];

    await prisma.projectStatus.createMany({
      data: defaultStages.map(stage => ({
        ...stage,
        organizationId: org.id,
      })),
    });

    await prisma.taskStatus.createMany({
      data: defaultStages.map(stage => ({
        ...stage,
        organizationId: org.id,
      })),
    });

    // Hash password & create Owner user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'OWNER',
        organizationId: org.id,
      },
    });

    // Update organization with the newly created ownerUserId
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { ownerUserId: user.id }
    });

    // Create Session
    await createSession(user);

    return { success: true };
  } catch (error: any) {
    console.error('Signup error:', error);
    return { error: error.message || 'Failed to sign up.' };
  }
}

export async function loginAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'Email and password are required.' };
    }

    // Find User (pick the first active one)
    const users = await prisma.user.findMany({
      where: { email, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' }, // usually the oldest org is the primary
    });

    if (users.length === 0) {
      return { error: 'Invalid email or password.' };
    }

    const user = users[0];

    // Verify Password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { error: 'Invalid email or password.' };
    }

    // Create Session if 2FA is not enabled
    if (user.twoFactorEnabled) {
      return { requiresTwoFactor: true, userId: user.id };
    }

    await establishSessionWithLastOrg(user);

    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: error.message || 'Failed to log in.' };
  }
}

export async function verifyTwoFactorLoginAction(userId: string, token: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return { error: 'Invalid 2FA state' };
    }

    const speakeasy = (await import('speakeasy')).default;
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!isValid) {
      return { error: 'Invalid verification code' };
    }

    await establishSessionWithLastOrg(user);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to verify 2FA' };
  }
}

export async function createOrganizationAction(name: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Fetch the current user's profile to clone it
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!currentUser) return { error: 'Current user not found' };

    // Create the new organization
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
    const org = await prisma.organization.create({
      data: { name, slug }
    });

    // Create a new User record for this organization
    const newUser = await prisma.user.create({
      data: {
        name: currentUser.name,
        email: currentUser.email,
        passwordHash: currentUser.passwordHash,
        role: 'OWNER',
        organizationId: org.id
      }
    });

    // Immediately switch session to the new organization
    await createSession(newUser);

    return { success: true, organizationId: org.id };
  } catch (error: any) {
    return { error: error.message || 'Failed to create organization.' };
  }
}

export async function switchOrganizationAction(organizationId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Find the User record for this email in the target organization
    const targetUser = await prisma.user.findFirst({
      where: {
        email: session.email,
        organizationId: organizationId,
        status: 'ACTIVE'
      }
    });

    if (!targetUser) {
      return { error: 'You do not have active access to this organization.' };
    }

    // Regenerate session
    await createSession(targetUser);
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to switch organization.' };
  }
}

export async function getUserOrganizationsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const memberships = await prisma.user.findMany({
      where: { email: session.email, status: 'ACTIVE' },
      include: { organization: true }
    });

    return { success: true, memberships };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch organizations.' };
  }
}

export async function logoutAction() {
  await destroySession();
  return { success: true };
}

export async function getCurrentUser() {
  return await getSession();
}

export async function deleteOrganizationAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const targetOrg = await prisma.organization.findUnique({
      where: { id }
    });

    if (!targetOrg) return { error: 'Organization not found' };

    if (targetOrg.ownerUserId !== session.userId) {
      return { error: 'Only the organization owner can delete it.' };
    }

    await prisma.organization.delete({
      where: { id }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete organization.' };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    if (!email) return { error: 'Email is required' };

    // Find all users with this email (might be multiple if in different orgs, but we just update one or all)
    // Actually, usually users have the same password across orgs in this setup if they were added, 
    // or they have different rows. Let's find all rows with this email.
    const users = await prisma.user.findMany({
      where: { email }
    });

    if (users.length === 0) {
      return { error: 'No account found with that email address.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update all user records with this email
    await prisma.user.updateMany({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
      // Note: In production, use the actual domain from env

      await transporter.sendMail({
        from: `"OmniWork Support" <${process.env.EMAIL_USER}>`,
        to: email,
        replyTo: process.env.EMAIL_USER,
        subject: 'Reset Your OmniWork Password',
        text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
    <h2 style="color: #333333; margin-top: 0;">Reset Your Password</h2>
    <p style="color: #555555; font-size: 16px;">We received a request to reset your password.</p>
    <div style="margin: 30px 0;">
      <a href="${resetLink}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
    </div>
    <p style="color: #777777; font-size: 14px; line-height: 1.5;">
      If you did not request a password reset, please ignore this email or reply to let us know. This link is only valid for the next 1 hour.
    </p>
    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0 20px 0;" />
    <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">
      © ${new Date().getFullYear()} OmniWork. All rights reserved.
    </p>
  </div>
</body>
</html>
        `,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return { error: 'Failed to process request.' };
  }
}

export async function resetPasswordAction(formData: FormData) {
  try {
    const token = formData.get('token') as string;
    const password = formData.get('password') as string;

    if (!token || !password) {
      return { error: 'Token and new password are required.' };
    }

    const users = await prisma.user.findMany({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (users.length === 0) {
      return { error: 'Invalid or expired reset token.' };
    }

    const passwordHash = await hashPassword(password);

    // Update all users that had this token
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null
        }
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Reset password error:', error);
    return { error: 'Failed to reset password.' };
  }
}
