import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
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

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    
    // Verify user and organization still exist and user is ACTIVE
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true,
        status: true, 
        organizationId: true,
        ownedOrganizations: { select: { id: true } }
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.organizationId !== decoded.organizationId) {
      return null;
    }

    // Check for active organization override
    const activeOrgCookie = cookieStore.get('omniwork_active_org')?.value;
    if (activeOrgCookie && activeOrgCookie !== decoded.organizationId) {
      // Validate that the user owns this active org or it's a child of their base org
      const activeOrg = await prisma.organization.findFirst({
        where: {
          id: activeOrgCookie,
          OR: [
            { ownerUserId: user.id },
            { parentOrganizationId: decoded.organizationId }, // Allow if it's a child of the base org
            { id: decoded.organizationId } // Self
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
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
