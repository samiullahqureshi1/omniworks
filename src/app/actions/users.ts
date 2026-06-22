'use server';

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
    const password = formData.get('password') as string;
    const roleString = formData.get('role') as string;

    if (!name || !email || !password || !roleString) {
      return { error: 'All fields are required.' };
    }

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { error: 'Invalid email format.' };
    }

    const role = roleString as 'OWNER' | 'MEMBER' | 'CLIENT';

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'A user with this email already exists.' };
    }

    // Hash password & create user
    const passwordHash = await hashPassword(password);
    
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

    revalidatePath('/workspace/users');
    return { success: true, message: 'User added successfully.' };
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
      const existingUser = await prisma.user.findUnique({ where: { email } });
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
    return { error: error.message || 'Failed to reset password.' };
  }
}
