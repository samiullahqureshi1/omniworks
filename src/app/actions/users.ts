'use server';

import nodemailer from 'nodemailer';

import { prisma } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import {
  assertCanAssignRole,
  assertNotLastOwner,
  can,
  membershipPermissionKey,
  requireMembershipAccess,
  requireMembershipCreate,
  toErrorResponse,
} from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

// Fetch all users for the organization
export async function getUsersAction() {
  try {
    const session = await getSession();
    if (!session) {
      return { error: 'Unauthorized' };
    }

    // This action backs BOTH the Users page and the Clients page, so it returns only
    // the modules the caller may view: USER_VIEW covers non-client memberships,
    // CLIENT_VIEW covers client memberships. No permission on either → empty list.
    const canViewUsers = can(session, 'USER_VIEW');
    const canViewClients = can(session, 'CLIENT_VIEW');

    if (!canViewUsers && !canViewClients) {
      return { success: true, users: [] };
    }

    const roleScope = canViewUsers && canViewClients
      ? {}
      : canViewClients
        ? { role: 'CLIENT' as const }
        : { NOT: { role: 'CLIENT' as const } };

    // Strictly scoped by current user's organizationId
    const users = await prisma.user.findMany({
      where: { organizationId: session.organizationId, ...roleScope },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
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
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const roleString = formData.get('role') as string;
    const permissionsString = formData.get('permissions') as string | null;

    if (!name || !email || !roleString) {
      return { error: 'All fields are required.' };
    }

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { error: 'Invalid email format.' };
    }

    const role = roleString as 'OWNER' | 'MEMBER' | 'CLIENT';

    // The requested role selects the module: CLIENT_CREATE for clients, USER_CREATE
    // for everyone else. Also blocks a non-owner from minting an OWNER/MASTER_ADMIN.
    // The membership is always created in the caller's session organization — the
    // organizationId is never taken from the request.
    const session = await requireMembershipCreate(role);

    let parsedPermissions: any = undefined;
    if (permissionsString) {
      try { parsedPermissions = JSON.parse(permissionsString); } catch {}
    }

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
          ...(parsedPermissions ? { permissions: parsedPermissions } : {}),
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
          ...(parsedPermissions ? { permissions: parsedPermissions } : {}),
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
    revalidatePath('/workspace/clients');
    return { success: true, message: 'User added successfully. An email with credentials has been sent.' };
  } catch (error: any) {
    console.error('Add user error:', error);
    const mapped = toErrorResponse(error);
    if (mapped.status !== 500) return { error: mapped.error };
    return { error: 'Failed to add user.' };
  }
}

// Edit an existing user
export async function editUserAction(id: string, formData: FormData) {
  try {
    // USER_EDIT for members, CLIENT_EDIT for clients — resolved from the TARGET's role.
    // Also guarantees the membership belongs to the caller's organization (404 otherwise).
    const { session, target: targetUser } = await requireMembershipAccess(id, 'EDIT');

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const roleString = formData.get('role') as string;
    const statusString = formData.get('status') as string;
    const permissionsString = formData.get('permissions') as string | null;

    if (!name || !email || !roleString || !statusString) {
      return { error: 'All fields are required.' };
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

    // Privilege escalation guard: only OWNER/MASTER_ADMIN may grant a privileged role.
    assertCanAssignRole(session, role);

    // Moving a record between the User and Client modules requires permission on the
    // destination module too, otherwise CLIENT_EDIT could be used to mint a MEMBER.
    if (role !== targetUser.role) {
      const destinationKey = membershipPermissionKey(role, 'EDIT');
      if (!can(session, destinationKey)) {
        return { error: 'You do not have permission to change this user to that role.' };
      }
    }

    // The final owner must not be demoted or deactivated.
    if (targetUser.role === 'OWNER' && (role !== 'OWNER' || status === 'INACTIVE')) {
      await assertNotLastOwner(session.organizationId, targetUser);
    }

    let parsedPermissions: any = undefined;
    if (permissionsString) {
      try { parsedPermissions = JSON.parse(permissionsString); } catch {}
    }

    await prisma.user.update({
      // Scoped by organization so a membership in another org can never be updated.
      where: { id: targetUser.id },
      data: {
        name,
        email,
        role,
        status,
        ...(parsedPermissions !== undefined ? { permissions: parsedPermissions } : {}),
      },
    });

    revalidatePath('/workspace/users');
    revalidatePath('/workspace/clients');
    return { success: true, message: 'User updated successfully.' };
  } catch (error: any) {
    const mapped = toErrorResponse(error);
    if (mapped.status !== 500) return { error: mapped.error };
    return { error: 'Failed to edit user.' };
  }
}

// Deactivate User (Soft Delete)
export async function deactivateUserAction(id: string) {
  try {
    // Deactivation removes access, so it is gated by the DELETE permission of the
    // module the target belongs to (USER_DELETE / CLIENT_DELETE).
    const { session, target: targetUser } = await requireMembershipAccess(id, 'DELETE');

    if (targetUser.id === session.userId) {
      return { error: 'You cannot deactivate your own account.' };
    }

    await assertNotLastOwner(session.organizationId, targetUser);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { status: 'INACTIVE' }
    });

    revalidatePath('/workspace/users');
    revalidatePath('/workspace/clients');
    return { success: true, message: 'User deactivated successfully.' };
  } catch (error: any) {
    const mapped = toErrorResponse(error);
    if (mapped.status !== 500) return { error: mapped.error };
    return { error: 'Failed to deactivate user.' };
  }
}

// Activate User
export async function activateUserAction(id: string) {
  try {
    const { target: targetUser } = await requireMembershipAccess(id, 'EDIT');

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { status: 'ACTIVE' }
    });

    revalidatePath('/workspace/users');
    revalidatePath('/workspace/clients');
    return { success: true, message: 'User activated successfully.' };
  } catch (error: any) {
    const mapped = toErrorResponse(error);
    if (mapped.status !== 500) return { error: mapped.error };
    return { error: 'Failed to activate user.' };
  }
}

// Reset Password manually by Owner
export async function resetUserPasswordAction(id: string, formData: FormData) {
  try {
    const { target: targetUser } = await requireMembershipAccess(id, 'EDIT');

    const password = formData.get('password') as string;

    if (!password) {
      return { error: 'Password is required.' };
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { passwordHash }
    });

    return { success: true, message: 'Password reset successfully.' };
  } catch (error: any) {
    const mapped = toErrorResponse(error);
    if (mapped.status !== 500) return { error: mapped.error };
    return { error: 'Failed to reset password.' };
  }
}

export async function acceptInvitationAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  return { success: true };
}

/**
 * Removes a membership from the CURRENT organization only.
 *
 * This archives the membership (status = INACTIVE) instead of deleting the row.
 * That is deliberate: `User` is the membership record, and several relations cascade
 * from it (TimeEntry.member, TaskAssignee, ActivityLog, IdlePeriod, screenshots…),
 * so a hard delete would destroy time entries and history — which the Client module
 * explicitly must never do. Archiving revokes access while preserving all history,
 * and it never touches the person's memberships in other organizations, so the
 * global account always survives.
 */
export async function deleteUserAction(id: string) {
  try {
    // USER_DELETE for members, CLIENT_DELETE for clients — based on the target's role.
    const { session, target: targetUser } = await requireMembershipAccess(id, 'DELETE');

    if (targetUser.id === session.userId) {
      return { error: 'You cannot remove your own account.' };
    }

    await assertNotLastOwner(session.organizationId, targetUser);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { status: 'INACTIVE' },
    });

    revalidatePath('/workspace/users');
    revalidatePath('/workspace/clients');
    return {
      success: true,
      message:
        targetUser.role === 'CLIENT'
          ? 'Client archived and removed from this organization.'
          : 'User removed from this organization.',
    };
  } catch (error: any) {
    const mapped = toErrorResponse(error);
    if (mapped.status !== 500) return { error: mapped.error };
    return { error: 'Failed to remove user.' };
  }
}
