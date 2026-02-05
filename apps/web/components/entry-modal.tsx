"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { useCalendarStore, type CalendarEntry } from "@/lib/stores/calendarStore"
import {
  createEntry as createEntryApi,
  updateEntry as updateEntryApi,
  deleteEntry as deleteEntryApi,
} from "@/lib/api/calendar"

function formatDateTimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function formatDateLocal(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function parseDateTimeLocal(value: string): Date {
  return new Date(value)
}

function parseDateLocal(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

interface EntryFormProps {
  editingEntry: CalendarEntry | null
  defaultStartDate: Date | null
  onSubmit: (entry: CalendarEntry) => void
  onCancel: () => void
  onDelete?: () => void
  isSubmitting?: boolean
}

function EntryForm({ editingEntry, defaultStartDate, onSubmit, onCancel, onDelete, isSubmitting }: EntryFormProps) {
  const initialValues = useMemo(() => {
    if (editingEntry) {
      return {
        title: editingEntry.title,
        wholeDay: editingEntry.wholeDay,
        startDate: editingEntry.wholeDay
          ? formatDateLocal(editingEntry.startDate)
          : formatDateTimeLocal(editingEntry.startDate),
        endDate: editingEntry.wholeDay
          ? formatDateLocal(editingEntry.endDate)
          : formatDateTimeLocal(editingEntry.endDate),
        content: editingEntry.content ?? "",
      }
    }

    const start = defaultStartDate ?? (() => {
      const now = new Date()
      now.setMinutes(0, 0, 0)
      return now
    })()
    const end = new Date(start.getTime() + 60 * 60 * 1000)

    return {
      title: "",
      wholeDay: false,
      startDate: formatDateTimeLocal(start),
      endDate: formatDateTimeLocal(end),
      content: "",
    }
  }, [editingEntry, defaultStartDate])

  const [title, setTitle] = useState(initialValues.title)
  const [startDate, setStartDate] = useState(initialValues.startDate)
  const [endDate, setEndDate] = useState(initialValues.endDate)
  const [content, setContent] = useState(initialValues.content)
  const [wholeDay, setWholeDay] = useState(initialValues.wholeDay)

  const handleWholeDayChange = (checked: boolean) => {
    setWholeDay(checked)

    if (checked && startDate.includes("T")) {
      setStartDate(formatDateLocal(parseDateTimeLocal(startDate)))
      setEndDate(formatDateLocal(parseDateTimeLocal(endDate)))
    } else if (!checked && !startDate.includes("T")) {
      const start = parseDateLocal(startDate)
      start.setHours(9, 0, 0, 0)
      const end = parseDateLocal(endDate)
      end.setHours(10, 0, 0, 0)
      setStartDate(formatDateTimeLocal(start))
      setEndDate(formatDateTimeLocal(end))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !startDate || !endDate) {
      return
    }

    const entry: CalendarEntry = {
      id: editingEntry?.id ?? crypto.randomUUID(),
      title: title.trim(),
      startDate: wholeDay ? parseDateLocal(startDate) : parseDateTimeLocal(startDate),
      endDate: wholeDay ? parseDateLocal(endDate) : parseDateTimeLocal(endDate),
      wholeDay,
      content: content.trim() || undefined,
    }

    onSubmit(entry)
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Entry title"
            required
          />
        </Field>

        <Field orientation="horizontal" className="items-center">
          <Checkbox
            id="wholeDay"
            checked={wholeDay}
            onCheckedChange={(checked) => handleWholeDayChange(checked === true)}
          />
          <FieldLabel htmlFor="wholeDay" className="cursor-pointer">
            All day
          </FieldLabel>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="startDate">Start</FieldLabel>
            <Input
              id="startDate"
              type={wholeDay ? "date" : "datetime-local"}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="endDate">End</FieldLabel>
            <Input
              id="endDate"
              type={wholeDay ? "date" : "datetime-local"}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="content">Description</FieldLabel>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Optional description"
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
            Delete
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {editingEntry ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function EntryModal() {
  const {
    isEntryModalOpen,
    editingEntry,
    defaultStartDate,
    closeEntryModal,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useCalendarStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (entry: CalendarEntry) => {
    setIsSubmitting(true)
    try {
      if (editingEntry) {
        const updated = await updateEntryApi(entry)
        if (updated) {
          updateEntry(updated)
          closeEntryModal()
        }
      } else {
        const created = await createEntryApi({
          title: entry.title,
          startDate: entry.startDate,
          endDate: entry.endDate,
          wholeDay: entry.wholeDay,
          content: entry.content,
        })
        if (created) {
          addEntry(created)
          closeEntryModal()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingEntry) return
    setIsSubmitting(true)
    try {
      const result = await deleteEntryApi(editingEntry.id)
      if (result.success) {
        deleteEntry(editingEntry.id)
        closeEntryModal()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formKey = useMemo(() => {
    if (!isEntryModalOpen) return "closed"
    return editingEntry?.id ?? defaultStartDate?.getTime() ?? "new"
  }, [isEntryModalOpen, editingEntry, defaultStartDate])

  return (
    <Dialog open={isEntryModalOpen} onOpenChange={(open) => !open && closeEntryModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? "Edit Entry" : "New Entry"}
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
  )
}
