'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { verifyPassword, hashPassword } from '@/lib/auth';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function changePasswordAction(currentPassword: string, newPassword: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) return { error: 'User not found' };

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return { error: 'Incorrect current password' };
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedNewPassword }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to change password' };
  }
}

export async function generateTwoFactorSecretAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) return { error: 'User not found' };

    // Generate secret
    const secretInfo = speakeasy.generateSecret({ name: `Omniwork (${user.email})` });
    const secret = secretInfo.base32;
    
    // Save secret temporarily in DB (or overwrite existing if they restart setup)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false }
    });

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(secretInfo.otpauth_url || '');

    return { success: true, qrCodeUrl, secret };
  } catch (error: any) {
    return { error: error.message || 'Failed to generate 2FA secret' };
  }
}

export async function verifyAndEnableTwoFactorAction(token: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user || !user.twoFactorSecret) {
      return { error: '2FA setup not initialized' };
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!isValid) {
      return { error: 'Invalid verification code' };
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to enable 2FA' };
  }
}

export async function disableTwoFactorAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    await prisma.user.update({
      where: { id: session.userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to disable 2FA' };
  }
}
