'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GlobeIcon, MonitorIcon, SmartphoneIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { validatePassword } from '@/lib/utils/password';
import {
  updatePassword,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  type Session,
} from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

const MOBILE_OS = ['android', 'ios', 'iphone', 'ipad', 'mobile'];

function getDeviceIcon(deviceName: string | null) {
  if (!deviceName) return GlobeIcon;
  const lower = deviceName.toLowerCase();
  if (MOBILE_OS.some((os) => lower.includes(os))) return SmartphoneIcon;
  if (
    lower.includes('windows') ||
    lower.includes('mac') ||
    lower.includes('linux') ||
    lower.includes('chrome') ||
    lower.includes('firefox') ||
    lower.includes('safari')
  )
    return MonitorIcon;
  return GlobeIcon;
}

export function SecurityTab() {
  const t = useTranslations('settings.security');
  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('auth.validation');
  const router = useRouter();

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      toast.error(t('failedLoadSessions'));
    } finally {
      setIsLoadingSessions(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const passwordValid = validatePassword(newPassword, tAuth) === null;
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    passwordValid &&
    passwordsMatch;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsUpdating(true);
    setPasswordError('');

    const result = await updatePassword(currentPassword, newPassword);

    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchSessions();
    } else {
      setPasswordError(result.error ?? '');
    }

    setIsUpdating(false);
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      toast.error(t('failedRevokeSession'));
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      await revokeAllOtherSessions();
      router.push('/login');
    } catch {
      toast.error(t('failedSignOutAll'));
      setIsRevokingAll(false);
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="flex flex-col gap-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>{t('changePassword')}</CardTitle>
          <CardDescription>{t('changePasswordDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="current-password">
                {t('currentPassword')}
              </FieldLabel>
              <PasswordInput
                id="current-password"
                required
                maxLength={128}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError('');
                }}
              />
            </Field>

            <Separator />

            <Field>
              <FieldLabel htmlFor="new-password">{t('newPassword')}</FieldLabel>
              <PasswordInput
                id="new-password"
                required
                maxLength={128}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {newPassword && (
                <PasswordStrengthIndicator password={newPassword} />
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm-new-password">
                {t('confirmNewPassword')}
              </FieldLabel>
              <PasswordInput
                id="confirm-new-password"
                required
                maxLength={128}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-destructive text-sm">
                  {tValidation('passwordsDoNotMatch')}
                </p>
              )}
            </Field>

            {passwordError && (
              <p className="text-destructive text-sm">{passwordError}</p>
            )}

            <div>
              <Button type="submit" disabled={!canSubmit || isUpdating}>
                {isUpdating ? <Spinner /> : t('updatePassword')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('activeSessions')}</CardTitle>
          <CardDescription>{t('activeSessionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoadingSessions ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('noSessions')}</p>
          ) : (
            <>
              {sessions.map((session) => {
                const Icon = getDeviceIcon(session.deviceName);
                return (
                  <div
                    key={session.id}
                    className="bg-muted/50 flex items-center gap-4 rounded-lg p-4"
                  >
                    <Icon className="text-muted-foreground size-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {session.deviceName ?? t('unknownDevice')}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {session.ipAddress ?? t('unknownIP')}
                        {' \u00b7 '}
                        {formatDistanceToNow(new Date(session.lastUsedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {session.isCurrent ? (
                      <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        {t('current')}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={revokingId === session.id}
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        {revokingId === session.id ? <Spinner /> : t('revoke')}
                      </Button>
                    )}
                  </div>
                );
              })}

              {otherSessions.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive"
                    disabled={isRevokingAll}
                    onClick={handleRevokeAll}
                  >
                    {isRevokingAll ? <Spinner /> : t('signOutAll')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
