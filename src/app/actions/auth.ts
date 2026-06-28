'use server';

import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword, createSession, destroySession, getSession } from '@/lib/auth';

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

    // Create organization
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
    const org = await prisma.organization.create({
      data: {
        name: companyName,
        slug,
      },
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

    await createSession(user);

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

    await createSession(user);
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
