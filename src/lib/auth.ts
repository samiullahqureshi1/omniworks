import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'omnitrack-super-secret-jwt-key-2026';
const COOKIE_NAME = 'omnitrack_session';

export type PermissionAction = 'view' | 'edit' | 'create' | 'delete';
/**
 * `planner` is retained for backwards compatibility with permission matrices saved
 * before the Planner module was split into its six sub-modules (calendar, meeting,
 * event, reminder, contact, availability). It is no longer written by the UI.
 */
export type PermissionResource =
  | 'project'
  | 'task'
  | 'planner'
  | 'calendar'
  | 'meeting'
  | 'event'
  | 'reminder'
  | 'contact'
  | 'availability'
  | 'user'
  | 'client';
export type Permissions = {
  [R in PermissionResource]?: { [A in PermissionAction]?: boolean };
};

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MEMBER' | 'CLIENT' | 'MASTER_ADMIN';
  organizationId: string;
  organizationName: string;
  permissions?: Permissions;
}

export function hasPermission(
  session: UserSession | null | undefined,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  if (!session) return false;
  if (session.role === 'OWNER' || session.role === 'MASTER_ADMIN') return true;
  return session.permissions?.[resource]?.[action] === true;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MEMBER' | 'CLIENT' | 'MASTER_ADMIN';
  organizationId: string;
}) {
  const [org, dbUser] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { permissions: true },
    }),
  ]);

  // Identity only — permissions are deliberately NOT signed into the token.
  // The database is the source of truth (see getSession) so permission changes
  // take effect immediately, without the user having to log out and back in.
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: org?.name || 'Workspace',
  };

  const sessionData: UserSession = {
    ...tokenPayload,
    permissions: (dbUser?.permissions as Permissions) ?? undefined,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return sessionData;
}

// cache() deduplicates this function so it runs AT MOST ONCE per request,
// no matter how many server components call getSession() or getCurrentUser().
export const getSession = cache(async (): Promise<UserSession | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    // The JWT carries identity only; it is cryptographically verified here.
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;

    // Check for active organization override cookie (set when user switches org)
    const activeOrgCookie = cookieStore.get('omniwork_active_org')?.value;
    if (activeOrgCookie && activeOrgCookie !== decoded.organizationId) {
      // Only hit DB when switching orgs (uncommon path)
      const activeOrg = await prisma.organization.findFirst({
        where: {
          id: activeOrgCookie,
          OR: [
            { ownerUserId: decoded.userId },
            { parentOrganizationId: decoded.organizationId },
            { id: decoded.organizationId }
          ]
        },
        select: { id: true, name: true }
      });

      if (activeOrg) {
        decoded.organizationId = activeOrg.id;
        decoded.organizationName = activeOrg.name;
      }
    }

    // Authorization data ALWAYS comes from the database, never from the token, so
    // that permission (and role) changes apply on the very next request. This whole
    // function is wrapped in React cache(), so it costs at most one query per request.
    //
    // Resolve the membership row for the ACTIVE organization (User is unique on
    // [email, organizationId], so this is exactly one membership). Fall back to the
    // token's identity row for the child-org override path, where the user may not
    // hold a separate membership record in that organization.
    let dbUser = await prisma.user.findFirst({
      where: { email: decoded.email, organizationId: decoded.organizationId },
      select: { role: true, permissions: true },
    });

    if (!dbUser) {
      dbUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true, permissions: true },
      });
    }

    // Identity no longer exists — treat as signed out.
    if (!dbUser) return null;

    decoded.role = dbUser.role as UserSession['role'];
    decoded.permissions = (dbUser.permissions as Permissions) ?? undefined;

    return decoded;
  } catch {
    return null;
  }
});

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
