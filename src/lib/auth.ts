import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'omnitrack-super-secret-jwt-key-2026';
const COOKIE_NAME = 'omnitrack_session';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'OWNER' | 'MEMBER' | 'CLIENT';
  organizationId: string;
  organizationName: string;
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
  role: 'OWNER' | 'MEMBER' | 'CLIENT';
  organizationId: string;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true },
  });

  const sessionData: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: org?.name || 'Workspace',
  };

  const token = jwt.sign(sessionData, JWT_SECRET, { expiresIn: '7d' });

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

    // JWT.verify is cryptographic — no DB call needed for the happy path.
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

    return decoded;
  } catch {
    return null;
  }
});

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
