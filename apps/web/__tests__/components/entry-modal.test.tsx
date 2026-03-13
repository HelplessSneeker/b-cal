import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent, resetStores } from '../test-utils';
import { EntryModal } from '@/components/entry-modal';
import {
  useCalendarStore,
  type CalendarEntry,
} from '@/lib/stores/calendarStore';

vi.mock('@/lib/api/calendar', () => ({
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}));

import {
  createEntry as createEntryApi,
  updateEntry as updateEntryApi,
  deleteEntry as deleteEntryApi,
} from '@/lib/api/calendar';

const createMock = vi.mocked(createEntryApi);
const updateMock = vi.mocked(updateEntryApi);
const deleteMock = vi.mocked(deleteEntryApi);

beforeEach(() => {
  resetStores();
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

const testEntry: CalendarEntry = {
  id: 'entry-1',
  title: 'Test Meeting',
  startDate: new Date(2025, 5, 15, 10, 0),
  endDate: new Date(2025, 5, 15, 11, 0),
  wholeDay: false,
  content: 'Discussion notes',
};

const recurringEntry: CalendarEntry = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890:2025-06-15T10:00:00.000Z',
  title: 'Recurring Standup',
  startDate: new Date(2025, 5, 15, 10, 0),
  endDate: new Date(2025, 5, 15, 10, 30),
  wholeDay: false,
  isRecurring: true,
  recurrenceFrequency: 'DAILY',
  originalDate: new Date(2025, 5, 15, 10, 0),
};

describe('EntryModal', () => {
  it('creates a new entry', async () => {
    const created: CalendarEntry = {
      id: 'new-1',
      title: 'New Meeting',
      startDate: new Date(2025, 5, 15, 9, 0),
      endDate: new Date(2025, 5, 15, 10, 0),
      wholeDay: false,
    };
    createMock.mockResolvedValue(created);

    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: null,
      defaultStartDate: new Date(2025, 5, 15, 9, 0),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    expect(screen.getByText('New Entry')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'New Meeting');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
      const store = useCalendarStore.getState();
      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].title).toBe('New Meeting');
      expect(store.isEntryModalOpen).toBe(false);
    });
  });

  it('edits an existing entry', async () => {
    const updated = { ...testEntry, title: 'Updated Meeting' };
    updateMock.mockResolvedValue(updated);

    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: testEntry,
      entries: [testEntry],
      entryMap: new Map([[testEntry.id, testEntry]]),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    expect(screen.getByText('Edit Entry')).toBeInTheDocument();

    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toHaveValue('Test Meeting');

    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Meeting');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      const store = useCalendarStore.getState();
      expect(store.entries[0].title).toBe('Updated Meeting');
      expect(store.isEntryModalOpen).toBe(false);
    });
  });

  it('deletes an entry', async () => {
    deleteMock.mockResolvedValue(undefined);

    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: testEntry,
      entries: [testEntry],
      entryMap: new Map([[testEntry.id, testEntry]]),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('entry-1');
      const store = useCalendarStore.getState();
      expect(store.entries).toHaveLength(0);
      expect(store.isEntryModalOpen).toBe(false);
    });
  });

  it('cancel closes modal without API call', async () => {
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: null,
      defaultStartDate: new Date(2025, 5, 15, 9, 0),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(useCalendarStore.getState().isEntryModalOpen).toBe(false);
  });

  it('always uses datetime-local inputs regardless of all-day toggle', async () => {
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: null,
      defaultStartDate: new Date(2025, 5, 15, 9, 0),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    // Initially datetime-local
    expect(screen.getByLabelText('Start')).toHaveAttribute(
      'type',
      'datetime-local',
    );
    expect(screen.getByLabelText('End')).toHaveAttribute(
      'type',
      'datetime-local',
    );

    // Toggle all-day on — inputs stay as datetime-local
    await user.click(screen.getByLabelText('All day'));

    expect(screen.getByLabelText('Start')).toHaveAttribute(
      'type',
      'datetime-local',
    );
    expect(screen.getByLabelText('End')).toHaveAttribute(
      'type',
      'datetime-local',
    );
  });

  it('auto-sets all-day for multi-day entries', async () => {
    const multiDayEntry: CalendarEntry = {
      id: 'multi-1',
      title: 'Multi-day Event',
      startDate: new Date(2025, 5, 15, 10, 0),
      endDate: new Date(2025, 5, 17, 14, 0),
      wholeDay: true,
      content: '',
    };

    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: multiDayEntry,
      entries: [multiDayEntry],
      entryMap: new Map([[multiDayEntry.id, multiDayEntry]]),
    });

    render(<EntryModal />);

    const checkbox = screen.getByRole('checkbox', { name: 'All day' });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it('shows "New Entry" title for create, "Edit Entry" for edit', () => {
    // Test create mode
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: null,
      defaultStartDate: new Date(),
    });
    const { unmount } = render(<EntryModal />);
    expect(screen.getByText('New Entry')).toBeInTheDocument();
    unmount();

    // Test edit mode
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: testEntry,
    });
    render(<EntryModal />);
    expect(screen.getByText('Edit Entry')).toBeInTheDocument();
  });

  it('shows recurrence fields when creating a new entry', async () => {
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: null,
      defaultStartDate: new Date(2025, 5, 15, 9, 0),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    // Repeat select should be visible
    expect(screen.getByLabelText('Repeat')).toBeInTheDocument();

    // Select "Weekly" to show day toggles
    await user.selectOptions(screen.getByLabelText('Repeat'), 'WEEKLY');

    expect(screen.getByText('Repeat on')).toBeInTheDocument();
    expect(screen.getByLabelText('Ends on')).toBeInTheDocument();

    // Weekday buttons should be visible
    expect(screen.getByRole('button', { name: 'Mo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fr' })).toBeInTheDocument();
  });

  it('does not show recurrence fields when editing', () => {
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: testEntry,
      entries: [testEntry],
      entryMap: new Map([[testEntry.id, testEntry]]),
    });

    render(<EntryModal />);

    expect(screen.queryByLabelText('Repeat')).not.toBeInTheDocument();
  });

  it('shows scope dialog when editing a recurring entry', async () => {
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: recurringEntry,
      entries: [recurringEntry],
      entryMap: new Map([[recurringEntry.id, recurringEntry]]),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Edit recurring event')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: 'This event' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'This and following events' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'All events' }),
    ).toBeInTheDocument();
  });

  it('shows delete scope dialog when deleting a recurring entry', async () => {
    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: recurringEntry,
      entries: [recurringEntry],
      entryMap: new Map([[recurringEntry.id, recurringEntry]]),
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
    });
  });

  it('updates a recurring entry with scope and invalidates cache', async () => {
    updateMock.mockResolvedValue(recurringEntry);

    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: recurringEntry,
      entries: [recurringEntry],
      entryMap: new Map([[recurringEntry.id, recurringEntry]]),
      loadedRanges: [{ start: 0, end: 1 }],
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    // Click save to trigger scope dialog
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('Edit recurring event')).toBeInTheDocument();
    });

    // Select "All events" scope
    await user.click(screen.getByRole('button', { name: 'All events' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Recurring Standup' }),
        'ALL',
        expect.objectContaining({ frequency: 'DAILY' }),
      );
      // Cache should be invalidated (loadedRanges cleared)
      expect(useCalendarStore.getState().loadedRanges).toHaveLength(0);
      expect(useCalendarStore.getState().isEntryModalOpen).toBe(false);
    });
  });

  it('deletes a recurring entry with scope and invalidates cache', async () => {
    deleteMock.mockResolvedValue(undefined);

    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: recurringEntry,
      entries: [recurringEntry],
      entryMap: new Map([[recurringEntry.id, recurringEntry]]),
      loadedRanges: [{ start: 0, end: 1 }],
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    // Click delete to trigger scope dialog
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Delete recurring event')).toBeInTheDocument();
    });

    // Select "This event"
    await user.click(screen.getByRole('button', { name: 'This event' }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(recurringEntry.id, 'SINGLE');
      expect(useCalendarStore.getState().loadedRanges).toHaveLength(0);
      expect(useCalendarStore.getState().isEntryModalOpen).toBe(false);
    });
  });

  it('creates a recurring entry and invalidates cache', async () => {
    const created: CalendarEntry = {
      id: 'new-recurring-1',
      title: 'Daily Standup',
      startDate: new Date(2025, 5, 15, 9, 0),
      endDate: new Date(2025, 5, 15, 9, 30),
      wholeDay: false,
      isRecurring: true,
      recurrenceFrequency: 'DAILY',
    };
    createMock.mockResolvedValue(created);

    useCalendarStore.setState({
      isEntryModalOpen: true,
      editingEntry: null,
      defaultStartDate: new Date(2025, 5, 15, 9, 0),
      loadedRanges: [{ start: 0, end: 1 }],
    });

    const user = userEvent.setup();
    render(<EntryModal />);

    await user.type(screen.getByLabelText('Title'), 'Daily Standup');
    await user.selectOptions(screen.getByLabelText('Repeat'), 'DAILY');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Daily Standup',
          recurrenceFrequency: 'DAILY',
        }),
      );
      // Recurring entries invalidate cache instead of adding directly
      expect(useCalendarStore.getState().loadedRanges).toHaveLength(0);
      expect(useCalendarStore.getState().isEntryModalOpen).toBe(false);
    });
  });
});
