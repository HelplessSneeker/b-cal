export type ReminderJobData =
  | { type: 'poll' }
  | {
      type: 'send';
      calendarEntryId: string;
      occurrenceDate: string;
      userId: string;
      email: string;
      title: string;
      startDate: string;
    };
