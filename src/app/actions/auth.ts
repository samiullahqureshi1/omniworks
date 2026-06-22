'use strain'; // Wait, standard Next.js directive is 'use server';
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'User with this email already exists.' };
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

    // Find User
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Invalid email or password.' };
    }

    // Verify Password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return { error: 'Invalid email or password.' };
    }

    // Create Session
    await createSession(user);

    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: error.message || 'Failed to log in.' };
  }
}

export async function logoutAction() {
  await destroySession();
  return { success: true };
}

export async function getCurrentUser() {
  return await getSession();
}
