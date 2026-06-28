'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, KeyRound, Smartphone, CheckCircle2 } from 'lucide-react';
import { changePasswordAction, generateTwoFactorSecretAction, verifyAndEnableTwoFactorAction, disableTwoFactorAction } from '@/app/actions/security';
import { toast } from 'sonner';
import Image from 'next/image';

export default function SecurityFormsClient({ initialTwoFactorEnabled }: { initialTwoFactorEnabled: boolean }) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialTwoFactorEnabled);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState('');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    const res = await changePasswordAction(currentPassword, newPassword);
    setIsChangingPassword(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const startTwoFactorSetup = async () => {
    const res = await generateTwoFactorSecretAction();
    if (res.error) {
      toast.error(res.error);
    } else {
      setQrCodeUrl(res.qrCodeUrl || null);
    }
  };

  const verifyAndEnableTwoFactor = async () => {
    if (!setupToken) return toast.error('Please enter the 6-digit code');
    const res = await verifyAndEnableTwoFactorAction(setupToken);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Two-factor authentication enabled!');
      setTwoFactorEnabled(true);
      setQrCodeUrl(null);
      setSetupToken('');
    }
  };

  const disableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) return;
    const res = await disableTwoFactorAction();
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Two-factor authentication disabled');
      setTwoFactorEnabled(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Change Password Card */}
      <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px]">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <CardTitle className="text-xl">Change Password</CardTitle>
              <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-[#f8f9fc] dark:bg-[#181818]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</label>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-[#f8f9fc] dark:bg-[#181818]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-700 bg-[#f8f9fc] dark:bg-[#181818]"
              />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={isChangingPassword} className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold h-11">
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px]">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div>
              <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
              <CardDescription>Add additional security to your account using two-factor authentication.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {twoFactorEnabled ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2FA is currently enabled</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm">Your account is highly secure. You will be prompted for a verification code when logging in.</p>
              <Button onClick={disableTwoFactor} variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20">
                Disable Two-Factor Authentication
              </Button>
            </div>
          ) : qrCodeUrl ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-50 dark:bg-[#181818] rounded-2xl text-sm text-slate-600 dark:text-slate-300">
                Scan this QR code using an authenticator app (like Google Authenticator or Authy) and enter the 6-digit code below.
              </div>
              <div className="flex justify-center bg-white p-4 rounded-2xl border border-slate-100">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-700 bg-[#f8f9fc] dark:bg-[#181818] text-center tracking-widest font-mono text-lg"
                  maxLength={6}
                />
                <Button onClick={verifyAndEnableTwoFactor} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-8">
                  Verify
                </Button>
              </div>
              <Button onClick={() => setQrCodeUrl(null)} variant="ghost" className="rounded-xl text-slate-500 mt-2">Cancel Setup</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center mb-4">
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">2FA is not enabled</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm">When two-factor authentication is enabled, you will be prompted for a secure, random token during authentication.</p>
              <Button onClick={startTwoFactorSetup} className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 font-bold px-8 h-11">
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
