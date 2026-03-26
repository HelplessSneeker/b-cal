'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCalendarsStore } from '@/lib/stores/calendarsStore';
import { useCalendarStore } from '@/lib/stores/calendarStore';
import {
  createCalendar,
  updateCalendar,
  deleteCalendar,
  type CalendarColor,
  type CalendarDTO,
} from '@/lib/api/calendars';
import { getColorClasses } from '@/lib/utils/calendar-colors';
import { cn } from '@/lib/utils/utils';

const CALENDAR_COLORS: CalendarColor[] = [
  'red',
  'orange',
  'yellow',
  'lime',
  'teal',
  'cyan',
  'pink',
  'rose',
];

interface CalendarManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarManageDialog({
  open,
  onOpenChange,
}: CalendarManageDialogProps) {
  const t = useTranslations('calendar.calendars');
  const tCommon = useTranslations('common');
  const {
    calendars,
    addCalendar: addToStore,
    updateCalendar: updateInStore,
    removeCalendar: removeFromStore,
  } = useCalendarsStore();
  const invalidateCache = useCalendarStore((s) => s.invalidateCache);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<CalendarColor>('teal');

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<CalendarColor>('teal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CalendarDTO | null>(null);

  const canAdd = calendars.length < 5;

  const startEdit = (cal: CalendarDTO) => {
    setEditingId(cal.id);
    setEditName(cal.name);
    setEditColor(cal.color as CalendarColor);
    setShowAdd(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSubmitting(true);
    try {
      const updated = await updateCalendar(editingId, {
        name: editName.trim(),
        color: editColor,
      });
      updateInStore(updated);
      setEditingId(null);
    } catch {
      // Error toast shown by api()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createCalendar({
        name: newName.trim(),
        color: newColor,
      });
      addToStore(created);
      setNewName('');
      setNewColor('teal');
      setShowAdd(false);
    } catch {
      // Error toast shown by api()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (deleteEntries: boolean) => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await deleteCalendar(deleteTarget.id, deleteEntries);
      removeFromStore(deleteTarget.id);
      if (deleteEntries) {
        invalidateCache();
      }
      setDeleteTarget(null);
    } catch {
      // Error toast shown by api()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setEditingId(null);
      setShowAdd(false);
      setDeleteTarget(null);
    }
    onOpenChange(value);
  };

  return (
    <>
      <Dialog open={open && !deleteTarget} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t('manageTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {calendars.map((cal) =>
              editingId === cal.id ? (
                <div key={cal.id} className="space-y-2 rounded-md border p-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={50}
                    autoFocus
                  />
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={cancelEdit}
                      disabled={isSubmitting}
                      aria-label={tCommon('cancel')}
                    >
                      <X className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={handleSaveEdit}
                      disabled={isSubmitting || !editName.trim()}
                      aria-label={tCommon('save')}
                    >
                      <Check className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={cal.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <span
                    className={cn(
                      'size-3 shrink-0 rounded-full',
                      getColorClasses(cal.color).dot,
                    )}
                  />
                  <span className="flex-1 truncate text-sm">{cal.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => startEdit(cal)}
                    aria-label={t('editCalendar')}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(cal)}
                    aria-label={t('deleteCalendar')}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ),
            )}

            {calendars.length === 0 && !showAdd && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('empty')}
              </p>
            )}
          </div>

          {showAdd ? (
            <div className="space-y-2 rounded-md border p-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('namePlaceholder')}
                maxLength={50}
                autoFocus
              />
              <ColorPicker value={newColor} onChange={setNewColor} />
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdd(false);
                    setNewName('');
                  }}
                  disabled={isSubmitting}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={isSubmitting || !newName.trim()}
                >
                  {t('addCalendar')}
                </Button>
              </div>
            </div>
          ) : (
            canAdd && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setShowAdd(true);
                  setEditingId(null);
                }}
              >
                <Plus className="mr-2 size-3.5" />
                {t('addCalendar')}
              </Button>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('deleteTitle', { name: deleteTarget?.name ?? '' })}
            </DialogTitle>
            <DialogDescription>{t('deleteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={() => handleDelete(true)}
              disabled={isSubmitting}
              className="w-full"
            >
              {t('deleteEntries')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDelete(false)}
              disabled={isSubmitting}
              className="w-full"
            >
              {t('keepEntries')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isSubmitting}
              className="w-full"
            >
              {tCommon('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: CalendarColor;
  onChange: (color: CalendarColor) => void;
}) {
  const tColors = useTranslations('calendar.calendars');
  return (
    <div className="flex gap-1.5">
      {CALENDAR_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'size-6 rounded-full transition-all',
            getColorClasses(color).dot,
            value === color
              ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
              : 'opacity-60 hover:opacity-100',
          )}
          aria-label={tColors(`colors.${color}`)}
        />
      ))}
    </div>
  );
}
