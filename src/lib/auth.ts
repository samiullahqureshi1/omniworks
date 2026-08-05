import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from './db';
import { getCachedMembership } from './permission-cache';

const COOKIE_NAME = 'omnitrack_session';

/**
 * The session signing secret. There is deliberately NO fallback: a hardcoded
 * default would be public in the repository, letting anyone forge a session for
 * any user in any organization.
 *
 * Resolved lazily (rather than at module load) so a build without the variable
 * still succeeds — but any attempt to issue or verify a session fails loudly.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -hex 64` and add it to your environment.'
    );
  }
  return secret;
}

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

/**
 * Actions a CLIENT may never perform, whatever their permission matrix says.
 * Clients are external collaborators: they can see the work shared with them,
 * but they must not be able to add projects or tasks to the organization.
 * Enforced here so no call site (server action, API route or guard) can bypass it.
 */
const CLIENT_FORBIDDEN: ReadonlyArray<`${PermissionResource}.${PermissionAction}`> = [
  'project.create',
  'task.create',
];

export function hasPermission(
  session: UserSession | null | undefined,
  resource: PermissionResource,
  action: PermissionAction
): boolean {
  if (!session) return false;

  // Checked before the role bypass so it cannot be widened by a permission grant.
  if (session.role === 'CLIENT' && CLIENT_FORBIDDEN.includes(`${resource}.${action}`)) {
    return false;
  }

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

  const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: '7d' });

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
    const decoded = jwt.verify(token, getJwtSecret()) as UserSession;

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
    // that permission (and role) changes apply on the very next request.
    //
    // Resolve the membership row for the ACTIVE organization (User is unique on
    // [email, organizationId], so this is exactly one membership). Fall back to the
    // token's identity row for the child-org override path, where the user may not
    // hold a separate membership record in that organization.
    //
    // Wrapped in a short-lived cache that is invalidated whenever a role/permission/
    // status changes, so this costs a round trip only on a miss rather than on every
    // request. See src/lib/permission-cache.ts.
    const dbUser = await getCachedMembership(
      decoded.email,
      decoded.organizationId,
      async () => {
        const membership = await prisma.user.findFirst({
          where: { email: decoded.email, organizationId: decoded.organizationId },
          select: { id: true, role: true, permissions: true },
        });
        if (membership) {
          return {
            id: membership.id,
            role: membership.role,
            permissions: (membership.permissions as Permissions) ?? null,
          };
        }

        const identity = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, role: true, permissions: true },
        });
        if (!identity) return null;

        return {
          id: identity.id,
          role: identity.role,
          permissions: (identity.permissions as Permissions) ?? null,
        };
      }
    );

    // Identity no longer exists — treat as signed out.
    if (!dbUser) return null;

    decoded.role = dbUser.role as UserSession['role'];
    decoded.permissions = dbUser.permissions ?? undefined;

    return decoded;
  } catch {
    return null;
  }
});

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Signs a user in, restoring the organization they last switched to when they still
 * have access to it:
 *   - member/shared org -> re-issue the session as that org's user identity
 *   - child/owned org   -> base identity + active-org override cookie
 * Falls back to the user's own organization.
 *
 * NOTE: this deliberately lives here rather than in a `'use server'` module —
 * exporting it from one would publish it as a callable server action, letting a
 * client mint a session for any user id.
 */
export async function establishSessionWithLastOrg(baseUser: {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MEMBER' | 'CLIENT' | 'MASTER_ADMIN';
  organizationId: string;
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
