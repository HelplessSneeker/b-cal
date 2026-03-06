'use client';

import { useState, useMemo } from 'react';
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
} from '@/lib/api/calendar';

interface EntryFormProps {
  editingEntry: CalendarEntry | null;
  defaultStartDate: Date | null;
  onSubmit: (entry: CalendarEntry) => void;
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

  const isMultiDay = useMemo(() => {
    if (!startDate || !endDate) return false;
    return startDate.split('T')[0] !== endDate.split('T')[0];
  }, [startDate, endDate]);

  const effectiveWholeDay = wholeDay || isMultiDay;

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

    onSubmit(entry);
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

export function EntryModal() {
  const t = useTranslations('calendar.entry');
  const {
    isEntryModalOpen,
    editingEntry,
    defaultStartDate,
    closeEntryModal,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useCalendarStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (entry: CalendarEntry) => {
    setIsSubmitting(true);
    try {
      if (editingEntry) {
        const updated = await updateEntryApi(entry);
        updateEntry(updated);
        closeEntryModal();
      } else {
        const created = await createEntryApi({
          title: entry.title,
          startDate: entry.startDate,
          endDate: entry.endDate,
          wholeDay: entry.wholeDay,
          content: entry.content,
        });
        addEntry(created);
        closeEntryModal();
      }
    } catch {
      // Error toast already shown by api()
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    setIsSubmitting(true);
    try {
      await deleteEntryApi(editingEntry.id);
      deleteEntry(editingEntry.id);
      closeEntryModal();
    } catch {
      // Error toast already shown by api()
    } finally {
      setIsSubmitting(false);
    }
  };

  const formKey = useMemo(() => {
    if (!isEntryModalOpen) return 'closed';
    return editingEntry?.id ?? defaultStartDate?.getTime() ?? 'new';
  }, [isEntryModalOpen, editingEntry, defaultStartDate]);

  return (
    <Dialog
      open={isEntryModalOpen}
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
  );
}
