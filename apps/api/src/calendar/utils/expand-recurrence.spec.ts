import { expandRecurringEntry } from './expand-recurrence';

const baseEntry = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  title: 'Daily Standup',
  startDate: new Date('2026-03-01T09:00:00.000Z'),
  endDate: new Date('2026-03-01T09:30:00.000Z'),
  content: 'Team sync',
  wholeDay: false,
  userId: 'user-1',
  recurrenceFrequency: 'DAILY',
  recurrenceByDay: null,
  recurrenceUntil: new Date('2026-03-05T09:00:00.000Z'),
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  updatedAt: null,
};

describe('expandRecurringEntry', () => {
  describe('DAILY recurrence', () => {
    it('should generate daily occurrences within the window', () => {
      const occurrences = expandRecurringEntry(
        baseEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-05T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(5);
      expect(occurrences[0].startDate).toEqual(
        new Date('2026-03-01T09:00:00.000Z'),
      );
      expect(occurrences[0].endDate).toEqual(
        new Date('2026-03-01T09:30:00.000Z'),
      );
      expect(occurrences[4].startDate).toEqual(
        new Date('2026-03-05T09:00:00.000Z'),
      );
    });

    it('should preserve event duration for each occurrence', () => {
      const occurrences = expandRecurringEntry(
        baseEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-03T23:59:59.000Z'),
      );

      for (const occ of occurrences) {
        const duration = occ.endDate.getTime() - occ.startDate.getTime();
        expect(duration).toBe(30 * 60 * 1000); // 30 minutes
      }
    });

    it('should assign synthetic IDs', () => {
      const occurrences = expandRecurringEntry(
        baseEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-02T23:59:59.000Z'),
      );

      expect(occurrences[0].id).toBe(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890:2026-03-01T09:00:00.000Z',
      );
      expect(occurrences[1].id).toBe(
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890:2026-03-02T09:00:00.000Z',
      );
    });

    it('should set isRecurring to true', () => {
      const occurrences = expandRecurringEntry(
        baseEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-01T23:59:59.000Z'),
      );

      expect(occurrences[0].isRecurring).toBe(true);
    });
  });

  describe('WEEKLY recurrence', () => {
    it('should generate weekly occurrences without byDay', () => {
      const weeklyEntry = {
        ...baseEntry,
        recurrenceFrequency: 'WEEKLY',
        recurrenceUntil: new Date('2026-03-29T09:00:00.000Z'),
      };

      const occurrences = expandRecurringEntry(
        weeklyEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-31T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(5); // Mar 1, 8, 15, 22, 29
      expect(occurrences[1].startDate).toEqual(
        new Date('2026-03-08T09:00:00.000Z'),
      );
    });

    it('should generate weekly occurrences with byDay', () => {
      const weeklyByDayEntry = {
        ...baseEntry,
        recurrenceFrequency: 'WEEKLY',
        recurrenceByDay: 'MO,WE,FR', // March 2026: Mon=2, Wed=4, Fri=6
        recurrenceUntil: new Date('2026-03-07T23:59:59.000Z'),
      };

      const occurrences = expandRecurringEntry(
        weeklyByDayEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-07T23:59:59.000Z'),
      );

      // March 1 is Sunday, so: Mon 2, Wed 4, Fri 6 = 3 occurrences
      expect(occurrences).toHaveLength(3);
      expect(occurrences[0].startDate).toEqual(
        new Date('2026-03-02T09:00:00.000Z'),
      );
      expect(occurrences[1].startDate).toEqual(
        new Date('2026-03-04T09:00:00.000Z'),
      );
      expect(occurrences[2].startDate).toEqual(
        new Date('2026-03-06T09:00:00.000Z'),
      );
    });
  });

  describe('MONTHLY recurrence', () => {
    it('should generate monthly occurrences', () => {
      const monthlyEntry = {
        ...baseEntry,
        recurrenceFrequency: 'MONTHLY',
        recurrenceUntil: new Date('2026-06-01T09:00:00.000Z'),
      };

      const occurrences = expandRecurringEntry(
        monthlyEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-06-30T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(4); // Mar 1, Apr 1, May 1, Jun 1
      expect(occurrences[1].startDate).toEqual(
        new Date('2026-04-01T09:00:00.000Z'),
      );
    });

    it('should clamp day-of-month for shorter months', () => {
      const entry31st = {
        ...baseEntry,
        startDate: new Date('2026-01-31T09:00:00.000Z'),
        endDate: new Date('2026-01-31T09:30:00.000Z'),
        recurrenceFrequency: 'MONTHLY',
        recurrenceUntil: new Date('2026-04-30T09:00:00.000Z'),
      };

      const occurrences = expandRecurringEntry(
        entry31st,
        [],
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-04-30T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(4); // Jan 31, Feb 28, Mar 31, Apr 30
      expect(occurrences[1].startDate).toEqual(
        new Date('2026-02-28T09:00:00.000Z'),
      );
      expect(occurrences[3].startDate).toEqual(
        new Date('2026-04-30T09:00:00.000Z'),
      );
    });
  });

  describe('exceptions', () => {
    it('should skip cancelled occurrences', () => {
      const exceptions = [
        {
          originalDate: new Date('2026-03-02T09:00:00.000Z'),
          isCancelled: true,
        },
      ];

      const occurrences = expandRecurringEntry(
        baseEntry,
        exceptions,
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-03T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(2); // Mar 1 and Mar 3
      expect(occurrences[0].startDate).toEqual(
        new Date('2026-03-01T09:00:00.000Z'),
      );
      expect(occurrences[1].startDate).toEqual(
        new Date('2026-03-03T09:00:00.000Z'),
      );
    });

    it('should apply override fields from exceptions', () => {
      const exceptions = [
        {
          originalDate: new Date('2026-03-02T09:00:00.000Z'),
          isCancelled: false,
          title: 'Modified Standup',
          startDate: new Date('2026-03-02T10:00:00.000Z'),
          endDate: new Date('2026-03-02T10:30:00.000Z'),
          content: 'Rescheduled',
          wholeDay: null,
        },
      ];

      const occurrences = expandRecurringEntry(
        baseEntry,
        exceptions,
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-03T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(3);
      const modified = occurrences[1];
      expect(modified.title).toBe('Modified Standup');
      expect(modified.startDate).toEqual(new Date('2026-03-02T10:00:00.000Z'));
      expect(modified.endDate).toEqual(new Date('2026-03-02T10:30:00.000Z'));
      expect(modified.content).toBe('Rescheduled');
    });

    it('should use parent values for null override fields', () => {
      const exceptions = [
        {
          originalDate: new Date('2026-03-02T09:00:00.000Z'),
          isCancelled: false,
          title: 'Override Title',
        },
      ];

      const occurrences = expandRecurringEntry(
        baseEntry,
        exceptions,
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-03T23:59:59.000Z'),
      );

      const modified = occurrences[1];
      expect(modified.title).toBe('Override Title');
      expect(modified.content).toBe('Team sync'); // from parent
    });
  });

  describe('edge cases', () => {
    it('should return empty array when window is before entry start', () => {
      const occurrences = expandRecurringEntry(
        baseEntry,
        [],
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-02-28T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(0);
    });

    it('should return empty array when window is after recurrenceUntil', () => {
      const occurrences = expandRecurringEntry(
        baseEntry,
        [],
        new Date('2026-04-01T00:00:00.000Z'),
        new Date('2026-04-30T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(0);
    });

    it('should handle entry with no recurrenceUntil (cap at query end)', () => {
      const noEndEntry = {
        ...baseEntry,
        recurrenceUntil: null,
      };

      const occurrences = expandRecurringEntry(
        noEndEntry,
        [],
        new Date('2026-03-01T00:00:00.000Z'),
        new Date('2026-03-03T23:59:59.000Z'),
      );

      expect(occurrences).toHaveLength(3);
    });
  });
});
