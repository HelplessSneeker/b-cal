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
    deleteMock.mockResolvedValue({ success: true });

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

  it('all-day toggle changes input types', async () => {
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

    // Toggle all-day on
    await user.click(screen.getByLabelText('All day'));

    expect(screen.getByLabelText('Start')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('End')).toHaveAttribute('type', 'date');
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
});
