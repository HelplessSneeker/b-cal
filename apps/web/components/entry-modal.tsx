'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';
import { useLocale } from '@/lib/hooks/useLocale';
import {
  formatDateTimeLocal,
  parseDateTimeLocal,
} from '@/lib/calendar/time-utils';
import {
  createEntry as createEntryApi,
  updateEntry as updateEntryApi,
  deleteEntry as deleteEntryApi,
  type RecurrenceFrequency,
  type EditScope,
  type CreateEntryInput,
} from '@/lib/api/calendar';

const WEEKDAY_KEYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

interface EntryFormProps {
  editingEntry: CalendarEntry | null;
  defaultStartDate: Date | null;
  onSubmit: (
    entry: CalendarEntry,
    recurrence?: {
      frequency: RecurrenceFrequency;
      byDay?: string;
      until?: string;
    },
  ) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
}

function EntryForm({
  editingEntry,
  defaultStartDate,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting,
}: EntryFormProps) {
  const t = useTranslations('calendar.entry');
  const tValidation = useTranslations('calendar.validation');
  const tCommon = useTranslations('common');
  const tWeekdays = useTranslations('calendar.weekdays');
  const { timezone } = useLocale();
  const initialValues = useMemo(() => {
    if (editingEntry) {
      return {
        title: editingEntry.title,
        wholeDay: editingEntry.wholeDay,
        startDate: formatDateTimeLocal(editingEntry.startDate, timezone),
        endDate: formatDateTimeLocal(editingEntry.endDate, timezone),
        content: editingEntry.content ?? '',
      };
    }

    const start =
      defaultStartDate ??
      (() => {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        return now;
      })();
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    return {
      title: '',
      wholeDay: false,
      startDate: formatDateTimeLocal(start, timezone),
      endDate: formatDateTimeLocal(end, timezone),
      content: '',
    };
  }, [editingEntry, defaultStartDate, timezone]);

  const [title, setTitle] = useState(initialValues.title);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [content, setContent] = useState(initialValues.content);
  const [wholeDay, setWholeDay] = useState(initialValues.wholeDay);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isNewEntry = !editingEntry;
  const isEditingRecurring = !!editingEntry?.isRecurring;
  const showRecurrence = isNewEntry || isEditingRecurring;

  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    RecurrenceFrequency | ''
  >((editingEntry?.recurrenceFrequency as RecurrenceFrequency) ?? '');
  const [recurrenceByDay, setRecurrenceByDay] = useState<Set<string>>(
    editingEntry?.recurrenceByDay
      ? new Set(editingEntry.recurrenceByDay.split(','))
      : new Set(),
  );
  const [recurrenceUntil, setRecurrenceUntil] = useState(
    editingEntry?.recurrenceUntil
      ? editingEntry.recurrenceUntil.toISOString().split('T')[0]
      : '',
  );

  const isMultiDay = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate.split('T')[0] !== endDate.split('T')[0];
  }, [startDate, endDate]);

  const effectiveWholeDay = wholeDay || isMultiDay;

  const toggleByDay = useCallback((day: string) => {
    setRecurrenceByDay((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = tValidation('titleRequired');
    }
    if (!startDate) {
      newErrors.startDate = tValidation('startDateRequired');
    }
    if (!endDate) {
      newErrors.endDate = tValidation('endDateRequired');
    }
    if (startDate && endDate) {
      const start = parseDateTimeLocal(startDate, timezone);
      const end = parseDateTimeLocal(endDate, timezone);
      if (start > end) {
        newErrors.endDate = tValidation('endDateAfterStart');
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const entry: CalendarEntry = {
      id: editingEntry?.id ?? crypto.randomUUID(),
      title: title.trim(),
      startDate: parseDateTimeLocal(startDate, timezone),
      endDate: parseDateTimeLocal(endDate, timezone),
      wholeDay: effectiveWholeDay,
      content: content.trim() || undefined,
    };

    if (showRecurrence && recurrenceFrequency) {
      const byDay =
        recurrenceFrequency === 'WEEKLY' && recurrenceByDay.size > 0
          ? [...recurrenceByDay].join(',')
          : undefined;
      onSubmit(entry, {
        frequency: recurrenceFrequency,
        byDay,
        until: recurrenceUntil || undefined,
      });
    } else {
      onSubmit(entry);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field data-invalid={!!errors.title || undefined}>
          <FieldLabel htmlFor="title">{t('titleLabel')}</FieldLabel>
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder={t('titlePlaceholder')}
            maxLength={100}
            required
          />
          <FieldError>{errors.title}</FieldError>
        </Field>

        <Field orientation="horizontal" className="items-center">
          <Checkbox
            id="wholeDay"
            checked={effectiveWholeDay}
            onCheckedChange={(checked) => setWholeDay(checked === true)}
            disabled={isMultiDay}
          />
          <FieldLabel htmlFor="wholeDay" className="cursor-pointer">
            {t('allDay')}
          </FieldLabel>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.startDate || undefined}>
            <FieldLabel htmlFor="startDate">{t('start')}</FieldLabel>
            <Input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  startDate: '',
                  endDate: '',
                }));
              }}
              required
            />
            <FieldError>{errors.startDate}</FieldError>
          </Field>
          <Field data-invalid={!!errors.endDate || undefined}>
            <FieldLabel htmlFor="endDate">{t('end')}</FieldLabel>
            <Input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  startDate: '',
                  endDate: '',
                }));
              }}
              required
            />
            <FieldError>{errors.endDate}</FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="content">{t('description')}</FieldLabel>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            maxLength={5000}
            rows={3}
          />
        </Field>

        {showRecurrence && (
          <>
            <Field>
              <FieldLabel htmlFor="recurrence">{t('repeat')}</FieldLabel>
              <select
                id="recurrence"
                value={recurrenceFrequency}
                onChange={(e) =>
                  setRecurrenceFrequency(
                    e.target.value as RecurrenceFrequency | '',
                  )
                }
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
              >
                {!isEditingRecurring && (
                  <option value="">{t('repeatNone')}</option>
                )}
                <option value="DAILY">{t('repeatDaily')}</option>
                <option value="WEEKLY">{t('repeatWeekly')}</option>
                <option value="MONTHLY">{t('repeatMonthly')}</option>
              </select>
            </Field>

            {recurrenceFrequency === 'WEEKLY' && (
              <Field>
                <FieldLabel>{t('repeatDays')}</FieldLabel>
                <div className="flex gap-1">
                  {WEEKDAY_KEYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleByDay(day)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                        recurrenceByDay.has(day)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {tWeekdays(day.toLowerCase())}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {recurrenceFrequency && (
              <Field>
                <FieldLabel htmlFor="recurrenceUntil">
                  {t('repeatUntil')}
                </FieldLabel>
                <Input
                  id="recurrenceUntil"
                  type="date"
                  value={recurrenceUntil}
                  onChange={(e) => setRecurrenceUntil(e.target.value)}
                />
              </Field>
            )}
          </>
        )}
      </FieldGroup>

      <DialogFooter className="mt-6">
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isSubmitting}
            className="mr-auto"
          >
            {tCommon('delete')}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {editingEntry ? t('save') : t('create')}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface ScopeDialogProps {
  open: boolean;
  title: string;
  options: { value: EditScope; label: string }[];
  onSelect: (scope: EditScope) => void;
  onCancel: () => void;
}

function ScopeDialog({
  open,
  title,
  options,
  onSelect,
  onCancel,
}: ScopeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <Button
              key={opt.value}
              variant="outline"
              className="justify-start"
              onClick={() => onSelect(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EntryModal() {
  const t = useTranslations('calendar.entry');
  const tCommon = useTranslations('common');
  const {
    isEntryModalOpen,
    editingEntry,
    defaultStartDate,
    closeEntryModal,
    addEntry,
    invalidateCache,
  } = useCalendarStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scope dialog state
  const [scopeDialogMode, setScopeDialogMode] = useState<
    'edit' | 'delete' | null
  >(null);
  const [pendingEntry, setPendingEntry] = useState<CalendarEntry | null>(null);
  const [pendingRecurrence, setPendingRecurrence] = useState<{
    frequency: RecurrenceFrequency;
    byDay?: string;
    until?: string;
  } | null>(null);
  const [showFrequencyHint, setShowFrequencyHint] = useState(false);

  const isEditingRecurring = !!editingEntry?.isRecurring;

  const scopeOptions: { value: EditScope; label: string }[] = useMemo(() => {
    const prefix = scopeDialogMode === 'delete' ? 'deleteScope' : 'scope';
    return [
      { value: 'SINGLE' as EditScope, label: t(`${prefix}Single`) },
      {
        value: 'THIS_AND_FUTURE' as EditScope,
        label: t(`${prefix}ThisAndFuture`),
      },
      { value: 'ALL' as EditScope, label: t(`${prefix}All`) },
    ];
  }, [scopeDialogMode, t]);

  const handleSubmit = async (
    entry: CalendarEntry,
    recurrence?: {
      frequency: RecurrenceFrequency;
      byDay?: string;
      until?: string;
    },
  ) => {
    if (editingEntry) {
      if (isEditingRecurring) {
        // Show scope dialog before updating
        setPendingEntry(entry);
        setPendingRecurrence(recurrence ?? null);
        setScopeDialogMode('edit');
        return;
      }
      // Non-recurring update
      setIsSubmitting(true);
      try {
        const updated = await updateEntryApi(entry);
        // Update store directly for non-recurring
        useCalendarStore.getState().updateEntry(updated);
        closeEntryModal();
      } catch {
        // Error toast already shown by api()
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Create
      setIsSubmitting(true);
      try {
        const input: CreateEntryInput = {
          title: entry.title,
          startDate: entry.startDate,
          endDate: entry.endDate,
          wholeDay: entry.wholeDay,
          content: entry.content,
          recurrenceFrequency: recurrence?.frequency,
          recurrenceByDay: recurrence?.byDay,
          recurrenceUntil: recurrence?.until,
        };
        const created = await createEntryApi(input);
        if (recurrence) {
          // Recurring: invalidate cache to fetch expanded occurrences
          invalidateCache();
        } else {
          addEntry(created);
        }
        closeEntryModal();
      } catch {
        // Error toast already shown by api()
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const frequencyChanged =
    pendingRecurrence?.frequency !== editingEntry?.recurrenceFrequency;

  const handleScopeSelect = async (scope: EditScope) => {
    if (scope === 'ALL' && frequencyChanged) {
      // Frequency changed — show hint before proceeding
      setScopeDialogMode(null);
      setShowFrequencyHint(true);
      return;
    }
    setScopeDialogMode(null);
    setIsSubmitting(true);
    try {
      if (pendingEntry) {
        await updateEntryApi(
          pendingEntry,
          scope,
          pendingRecurrence ?? undefined,
        );
        invalidateCache();
        closeEntryModal();
      }
    } catch {
      // Error toast already shown by api()
    } finally {
      setIsSubmitting(false);
      setPendingEntry(null);
      setPendingRecurrence(null);
    }
  };

  const handleFrequencyHintConfirm = async () => {
    setShowFrequencyHint(false);
    setIsSubmitting(true);
    try {
      if (pendingEntry) {
        // Use THIS_AND_FUTURE so past events keep their original schedule
        await updateEntryApi(
          pendingEntry,
          'THIS_AND_FUTURE',
          pendingRecurrence ?? undefined,
        );
        invalidateCache();
        closeEntryModal();
      }
    } catch {
      // Error toast already shown by api()
    } finally {
      setIsSubmitting(false);
      setPendingEntry(null);
      setPendingRecurrence(null);
    }
  };

  const handleFrequencyHintCancel = () => {
    setShowFrequencyHint(false);
    // Go back to scope dialog
    setScopeDialogMode('edit');
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    if (isEditingRecurring) {
      setScopeDialogMode('delete');
      return;
    }
    // Non-recurring delete
    setIsSubmitting(true);
    try {
      await deleteEntryApi(editingEntry.id);
      useCalendarStore.getState().deleteEntry(editingEntry.id);
      closeEntryModal();
    } catch {
      // Error toast already shown by api()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteScopeSelect = async (scope: EditScope) => {
    if (!editingEntry) return;
    setScopeDialogMode(null);
    setIsSubmitting(true);
    try {
      await deleteEntryApi(editingEntry.id, scope);
      invalidateCache();
      closeEntryModal();
    } catch {
      // Error toast already shown by api()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScopeCancel = () => {
    setScopeDialogMode(null);
    setPendingEntry(null);
    setPendingRecurrence(null);
  };

  const formKey = useMemo(() => {
    if (!isEntryModalOpen) return 'closed';
    return editingEntry?.id ?? defaultStartDate?.getTime() ?? 'new';
  }, [isEntryModalOpen, editingEntry, defaultStartDate]);

  return (
    <>
      <Dialog
        open={isEntryModalOpen && !scopeDialogMode && !showFrequencyHint}
        onOpenChange={(open) => !open && closeEntryModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? t('editTitle') : t('newTitle')}
            </DialogTitle>
          </DialogHeader>
          {isEntryModalOpen && (
            <EntryForm
              key={formKey}
              editingEntry={editingEntry}
              defaultStartDate={defaultStartDate}
              onSubmit={handleSubmit}
              onCancel={closeEntryModal}
              onDelete={editingEntry ? handleDelete : undefined}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      <ScopeDialog
        open={scopeDialogMode !== null}
        title={
          scopeDialogMode === 'delete' ? t('deleteScopeTitle') : t('scopeTitle')
        }
        options={scopeOptions}
        onSelect={
          scopeDialogMode === 'delete'
            ? handleDeleteScopeSelect
            : handleScopeSelect
        }
        onCancel={handleScopeCancel}
      />

      <Dialog
        open={showFrequencyHint}
        onOpenChange={(open) => !open && handleFrequencyHintCancel()}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('frequencyChangeHintTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t('frequencyChangeHint')}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={handleFrequencyHintCancel}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleFrequencyHintConfirm}
              disabled={isSubmitting}
            >
              {t('frequencyChangeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
