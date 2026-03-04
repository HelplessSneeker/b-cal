'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser } from '@/lib/api/auth';
import { useUserStore } from '@/lib/stores/userStore';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

function getAvatarInitials(email: string): string {
  const [localPart, domain] = email.split('@');
  const localInitial = localPart?.[0]?.toUpperCase() ?? '';
  const domainInitial = domain?.[0]?.toUpperCase() ?? '';
  return `${localInitial}${domainInitial}`;
}

export function ProfileTab() {
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const { language } = useLocale();
  const clearCache = useCalendarStore((s) => s.clearCache);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const initials = user?.email ? getAvatarInitials(user.email) : '?';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(language, {
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteUser();
    if (result.success) {
      clearUser();
      clearCache();
      router.push('/login');
    }
    setIsDeleting(false);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your personal account details.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="size-16 text-lg">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-medium">{user?.email ?? '-'}</p>
                <p className="text-muted-foreground text-sm">
                  Member since {memberSince}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setConfirmEmail('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All your data will
              be deleted. Type your email address to confirm.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              placeholder={user?.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmEmail !== user?.email || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
