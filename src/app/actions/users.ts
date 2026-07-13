'use server';

import nodemailer from 'nodemailer';

import { prisma } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Fetch all users for the organization
export async function getUsersAction() {
  try {
    const session = await getSession();
    if (!session) {
      return { error: 'Unauthorized' };
    }

    // Strictly scoped by current user's organizationId
    const users = await prisma.user.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, users };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch users.' };
  }
}

// Add a new user directly
export async function addUserAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only owners can add users.' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const roleString = formData.get('role') as string;

    if (!name || !email || !roleString) {
      return { error: 'All fields are required.' };
    }

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { error: 'Invalid email format.' };
    }

    const role = roleString as 'OWNER' | 'MEMBER' | 'CLIENT';

    // Check if email already exists in this org
    const existingUser = await prisma.user.findFirst({
      where: { email, organizationId: session.organizationId },
    });

    if (existingUser) {
      return { error: 'A user with this email already exists.' };
    }

    // Generate random password
    const rawPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    const passwordHash = await hashPassword(rawPassword);

    // -------------------------------------------------------
    // For CLIENT/MEMBER roles: auto-create a personal org with OWNER
    // role first (so it becomes the default on login), then
    // add them to the current (shared) org with their designated role.
    // -------------------------------------------------------
    if (role === 'CLIENT' || role === 'MEMBER') {
      // 1. Create personal organization
      const personalOrgName = name.trim().split(' ')[0] + "'s Workspace";
      const personalSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

      const personalOrg = await prisma.organization.create({
        data: { name: personalOrgName, slug: personalSlug },
      });

      // Default project/task stages for the personal org
      const defaultStages = [
        { name: 'To Do', color: '#64748b', order: 0 },
        { name: 'In Progress', color: '#eab308', order: 1 },
        { name: 'In Review', color: '#a855f7', order: 2 },
        { name: 'Completed', color: '#22c55e', order: 3 },
      ];
      await prisma.projectStatus.createMany({
        data: defaultStages.map(s => ({ ...s, organizationId: personalOrg.id })),
      });
      await prisma.taskStatus.createMany({
        data: defaultStages.map(s => ({ ...s, organizationId: personalOrg.id })),
      });

      // 2. Create User record with OWNER in personal org (created first → default login org)
      const ownerUser = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
          organizationId: personalOrg.id,
        },
      });

      // Link personal org owner
      await prisma.organization.update({
        where: { id: personalOrg.id },
        data: { ownerUserId: ownerUser.id },
      });

      // 3. Create User record in the current (shared) org
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role,
          status: 'ACTIVE',
          organizationId: session.organizationId,
        },
      });
    } else {
      // Non-CLIENT/MEMBER: add directly to current org
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role,
          status: 'ACTIVE',
          organizationId: session.organizationId,
        },
      });
    }

    // Send email with credentials
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail', // You can change this if using another provider
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"OmniWork Support" <${process.env.EMAIL_USER}>`,
          to: email,
          replyTo: process.env.EMAIL_USER,
          subject: 'Your OmniWork Account Credentials',
          text: `Hi ${name},\n\nAn account has been created for you at OmniWork. Here are your login credentials:\n\nEmail: ${email}\nPassword: ${rawPassword}\n\nPlease log in and change your password from the security page as soon as possible.\n\nBest,\nThe OmniWork Team`,
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OmniWork Account Credentials</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
    <h2 style="color: #333333; margin-top: 0;">Welcome to OmniWork!</h2>
    <p style="color: #555555; font-size: 16px;">Hi ${name},</p>
    <p style="color: #555555; font-size: 16px;">An account has been created for you. Here are your login credentials:</p>
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 25px 0; border: 1px solid #eeeeee;">
      <p style="margin: 0; color: #333333; font-size: 15px;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 10px 0 0 0; color: #333333; font-size: 15px;"><strong>Password:</strong> ${rawPassword}</p>
    </div>
    <p style="color: #777777; font-size: 14px; line-height: 1.5;">
      <em>Please log in and change your password from the security page as soon as possible.</em>
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
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // We don't return an error here because the user was created successfully
      }
    }

    revalidatePath('/workspace/users');
    return { success: true, message: 'User added successfully. An email with credentials has been sent.' };
  } catch (error: any) {
    console.error('Add user error:', error);
    return { error: error.message || 'Failed to add user.' };
  }
}

// Edit an existing user
export async function editUserAction(id: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only owners can edit users.' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const roleString = formData.get('role') as string;
    const statusString = formData.get('status') as string;

    if (!name || !email || !roleString || !statusString) {
      return { error: 'All fields are required.' };
    }

    // Verify user belongs to same org
    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: session.organizationId }
    });

    if (!targetUser) {
      return { error: 'User not found in your organization.' };
    }

    // Check if changing email and if new email is already taken
    if (email !== targetUser.email) {
      const existingUser = await prisma.user.findFirst({ where: { email, organizationId: session.organizationId } });
      if (existingUser) {
        return { error: 'This email is already in use.' };
      }
    }

    const role = roleString as 'OWNER' | 'MEMBER' | 'CLIENT';
    const status = statusString as 'ACTIVE' | 'INACTIVE';

    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        status,
      },
    });

    revalidatePath('/workspace/users');
    return { success: true, message: 'User updated successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to edit user.' };
  }
}

// Deactivate User (Soft Delete)
export async function deactivateUserAction(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only owners can deactivate users.' };
    }

    if (id === session.userId) {
      return { error: 'You cannot deactivate your own account.' };
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: session.organizationId }
    });

    if (!targetUser) {
      return { error: 'User not found.' };
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    revalidatePath('/workspace/users');
    return { success: true, message: 'User deactivated successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to deactivate user.' };
  }
}

// Activate User
export async function activateUserAction(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only owners can activate users.' };
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: session.organizationId }
    });

    if (!targetUser) {
      return { error: 'User not found.' };
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    revalidatePath('/workspace/users');
    return { success: true, message: 'User activated successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to activate user.' };
  }
}

// Reset Password manually by Owner
export async function resetUserPasswordAction(id: string, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const password = formData.get('password') as string;

    if (!password) {
      return { error: 'Password is required.' };
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: session.organizationId }
    });

    if (!targetUser) {
      return { error: 'User not found.' };
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    return { success: true, message: 'Password reset successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to resend invitation.' };
  }
}

export async function acceptInvitationAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  return { success: true };
}

// Delete User
export async function deleteUserAction(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only owners can delete users.' };
    }

    if (id === session.userId) {
      return { error: 'You cannot delete your own account.' };
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, organizationId: session.organizationId }
    });

    if (!targetUser) {
      return { error: 'User not found.' };
    }

    if (targetUser.role === 'OWNER') {
      return { error: 'Owner cannot be deleted.' };
    }

    await prisma.user.delete({
      where: { id }
    });

    revalidatePath('/workspace/users');
    return { success: true, message: 'User deleted successfully.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete user.' };
  }
}
