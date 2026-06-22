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
      select: { status: true, organizationId: true },
    });

    if (!user || user.status !== 'ACTIVE' || user.organizationId !== decoded.organizationId) {
      // Invalid session: User deleted, deactivated, or DB was reset.
      // We do not delete the cookie here because this is often called inside Server Components (layout.tsx),
      // which throws an error if we try to mutate cookies. We let the layout redirect to /logout instead.
      return null;
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
