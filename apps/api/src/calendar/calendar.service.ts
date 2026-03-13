import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetCalendarEntriesDto } from './dto/get-calendar-entries.dto';
import { t } from 'src/common/utils/i18n';
import { EditScope } from './enums/edit-scope.enum';
import { isSyntheticId, parseSyntheticId } from './utils/occurrence-id';
import {
  expandRecurringEntry,
  VirtualOccurrence,
} from './utils/expand-recurrence';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private prismaService: PrismaService) {}

  async create(userId: string, createCalendarDto: CreateCalendarDto) {
    const entry = await this.prismaService.calendarEntry.create({
      data: {
        userId,
        ...createCalendarDto,
      },
    });
    this.logger.log(`Calendar entry created: ${entry.id} for user ${userId}`);
    return entry;
  }

  async findAll(userId: string, getCalendarEntriesDto: GetCalendarEntriesDto) {
    const { startDate, endDate } = getCalendarEntriesDto;

    // Fetch non-recurring entries
    const nonRecurring = await this.prismaService.calendarEntry.findMany({
      where: {
        userId,
        recurrenceFrequency: null,
        ...(startDate && { endDate: { gte: startDate } }),
        ...(endDate && { startDate: { lte: endDate } }),
      },
    });

    // Fetch recurring parents that could overlap the query window
    const recurringParents = await this.prismaService.calendarEntry.findMany({
      where: {
        userId,
        recurrenceFrequency: { not: null },
        ...(endDate && { startDate: { lte: endDate } }),
        ...(startDate && {
          OR: [
            { recurrenceUntil: null },
            { recurrenceUntil: { gte: startDate } },
          ],
        }),
      },
      include: { recurrenceExceptions: true },
    });

    // Expand recurring entries into virtual occurrences
    const queryStart = startDate ? new Date(startDate) : undefined;
    const queryEnd = endDate ? new Date(endDate) : undefined;

    const expandedOccurrences: VirtualOccurrence[] = [];
    for (const parent of recurringParents) {
      // recurrenceFrequency is guaranteed non-null by the query filter above
      const occurrences = expandRecurringEntry(
        parent as typeof parent & { recurrenceFrequency: string },
        parent.recurrenceExceptions,
        queryStart,
        queryEnd,
      );
      expandedOccurrences.push(...occurrences);
    }

    // Augment non-recurring entries with recurrence fields
    const augmentedNonRecurring = nonRecurring.map((entry) => ({
      ...entry,
      isRecurring: false,
      recurrenceFrequency: null,
      recurrenceByDay: null,
      recurrenceUntil: null,
      originalDate: null,
    }));

    return [...augmentedNonRecurring, ...expandedOccurrences];
  }

  async findOne(userId: string, id: string) {
    if (isSyntheticId(id)) {
      return this.findOccurrence(userId, id);
    }

    const entry = await this.prismaService.calendarEntry.findUnique({
      where: {
        userId,
        id,
      },
    });

    if (!entry) {
      this.logger.error(`Calendar entry not found: ${id} for user ${userId}`);
      throw new NotFoundException(t('error.calendarEntryNotFound'));
    }

    return {
      ...entry,
      isRecurring: !!entry.recurrenceFrequency,
      originalDate: entry.recurrenceFrequency ? entry.startDate : null,
    };
  }

  async update(
    userId: string,
    id: string,
    updateCalendarDto: UpdateCalendarDto,
  ) {
    const { scope, ...updateData } = updateCalendarDto;

    if (isSyntheticId(id)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.updateRecurringEntry(userId, id, scope, updateData);
    }

    // Load the entry to check if it's recurring
    const existingEntry = await this.findRawEntry(userId, id);

    if (existingEntry.recurrenceFrequency) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.updateRecurringEntry(userId, id, scope, updateData);
    }

    // Non-recurring: existing logic
    const startDate = new Date(updateData.startDate ?? existingEntry.startDate);
    const endDate = new Date(updateData.endDate ?? existingEntry.endDate);

    if (startDate > endDate) {
      this.logger.error(
        `Calendar entry update failed: invalid date range for ${id}`,
      );
      throw new BadRequestException(t('error.startDateBeforeEndDate'));
    }

    const entry = await this.prismaService.calendarEntry.update({
      where: {
        userId,
        id,
      },
      data: updateData,
    });
    this.logger.log(`Calendar entry updated: ${id}`);
    return entry;
  }

  async remove(userId: string, id: string, scope?: EditScope) {
    if (isSyntheticId(id)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.removeRecurringEntry(userId, id, scope);
    }

    const existingEntry = await this.findRawEntry(userId, id);

    if (existingEntry.recurrenceFrequency) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.removeRecurringEntry(userId, id, scope);
    }

    // Non-recurring: existing logic
    const entry = await this.prismaService.calendarEntry.delete({
      where: {
        userId,
        id,
      },
    });
    this.logger.log(`Calendar entry deleted: ${id}`);
    return entry;
  }

  // --- Private helpers ---

  private async findRawEntry(userId: string, id: string) {
    const entry = await this.prismaService.calendarEntry.findUnique({
      where: { userId, id },
    });
    if (!entry) {
      this.logger.error(`Calendar entry not found: ${id} for user ${userId}`);
      throw new NotFoundException(t('error.calendarEntryNotFound'));
    }
    return entry;
  }

  private async findOccurrence(userId: string, syntheticId: string) {
    const parsed = parseSyntheticId(syntheticId);
    if (!parsed) {
      throw new BadRequestException(t('error.invalidOccurrenceId'));
    }

    const parent = await this.prismaService.calendarEntry.findUnique({
      where: { userId, id: parsed.parentId },
      include: { recurrenceExceptions: true },
    });

    if (!parent || !parent.recurrenceFrequency) {
      throw new NotFoundException(t('error.occurrenceNotFound'));
    }

    // recurrenceFrequency is guaranteed non-null by the check above
    const occurrences = expandRecurringEntry(
      parent as typeof parent & { recurrenceFrequency: string },
      parent.recurrenceExceptions,
      parsed.originalDate,
      parsed.originalDate,
    );

    const occurrence = occurrences.find((o) => o.id === syntheticId);
    if (!occurrence) {
      throw new NotFoundException(t('error.occurrenceNotFound'));
    }

    return occurrence;
  }

  private async updateRecurringEntry(
    userId: string,
    id: string,
    scope: EditScope | undefined,
    updateData: Omit<UpdateCalendarDto, 'scope'>,
  ) {
    // Parse the id to determine if it's synthetic or a real parent
    const parsed = isSyntheticId(id) ? parseSyntheticId(id) : null;
    const parentId = parsed ? parsed.parentId : id;
    const originalDate = parsed ? parsed.originalDate : null;

    const effectiveScope = scope ?? EditScope.ALL;

    const parent = await this.prismaService.calendarEntry.findUnique({
      where: { userId, id: parentId },
    });

    if (!parent) {
      throw new NotFoundException(t('error.calendarEntryNotFound'));
    }

    switch (effectiveScope) {
      case EditScope.ALL: {
        const updatePayload: Record<string, unknown> = { ...updateData };

        // When editing via a synthetic ID the dates belong to a specific
        // occurrence, not the parent. Compute the time delta and apply it
        // to the parent so the series start date isn't shifted.
        if (originalDate) {
          const parentStart = new Date(parent.startDate);
          const parentEnd = new Date(parent.endDate);
          const duration = parentEnd.getTime() - parentStart.getTime();

          if (updateData.startDate) {
            const offset =
              new Date(updateData.startDate).getTime() - originalDate.getTime();
            updatePayload.startDate = new Date(parentStart.getTime() + offset);
          }

          if (updateData.endDate) {
            const expectedEnd = new Date(originalDate.getTime() + duration);
            const offset =
              new Date(updateData.endDate).getTime() - expectedEnd.getTime();
            updatePayload.endDate = new Date(parentEnd.getTime() + offset);
          }
        }

        // Only clear exceptions when the dates actually changed
        const newStart = updatePayload.startDate
          ? new Date(updatePayload.startDate as string | Date).getTime()
          : new Date(parent.startDate).getTime();
        const newEnd = updatePayload.endDate
          ? new Date(updatePayload.endDate as string | Date).getTime()
          : new Date(parent.endDate).getTime();
        const dateFieldsChanged =
          newStart !== new Date(parent.startDate).getTime() ||
          newEnd !== new Date(parent.endDate).getTime();

        const updatedEntry = await this.prismaService.$transaction(
          async (tx) => {
            if (dateFieldsChanged) {
              await tx.recurrenceException.deleteMany({
                where: { calendarEntryId: parentId },
              });
            }
            return tx.calendarEntry.update({
              where: { userId, id: parentId },
              data: updatePayload,
            });
          },
        );

        this.logger.log(`Recurring entry updated (ALL): ${parentId}`);
        return updatedEntry;
      }

      case EditScope.SINGLE: {
        if (!originalDate) {
          throw new BadRequestException(t('error.invalidOccurrenceId'));
        }

        const exception = await this.prismaService.recurrenceException.upsert({
          where: {
            calendarEntryId_originalDate: {
              calendarEntryId: parentId,
              originalDate,
            },
          },
          create: {
            calendarEntryId: parentId,
            originalDate,
            isCancelled: false,
            title: updateData.title,
            startDate: updateData.startDate
              ? new Date(updateData.startDate)
              : undefined,
            endDate: updateData.endDate
              ? new Date(updateData.endDate)
              : undefined,
            content: updateData.content,
            wholeDay: updateData.wholeDay,
          },
          update: {
            title: updateData.title,
            startDate: updateData.startDate
              ? new Date(updateData.startDate)
              : undefined,
            endDate: updateData.endDate
              ? new Date(updateData.endDate)
              : undefined,
            content: updateData.content,
            wholeDay: updateData.wholeDay,
          },
        });

        this.logger.log(
          `Recurring entry updated (SINGLE): ${parentId} occurrence ${originalDate.toISOString()}`,
        );
        return exception;
      }

      case EditScope.THIS_AND_FUTURE: {
        if (!originalDate) {
          throw new BadRequestException(t('error.invalidOccurrenceId'));
        }

        // If editing the first occurrence, it's equivalent to ALL
        if (originalDate.getTime() === new Date(parent.startDate).getTime()) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return this.updateRecurringEntry(
            userId,
            parentId,
            EditScope.ALL,
            updateData,
          );
        }

        const dayBefore = new Date(originalDate);
        dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

        const result = await this.prismaService.$transaction(async (tx) => {
          // Truncate the original series
          await tx.calendarEntry.update({
            where: { userId, id: parentId },
            data: { recurrenceUntil: dayBefore },
          });

          // Remove future exceptions
          await tx.recurrenceException.deleteMany({
            where: {
              calendarEntryId: parentId,
              originalDate: { gte: originalDate },
            },
          });

          // Compute the new entry's dates
          const durationMs =
            new Date(parent.endDate).getTime() -
            new Date(parent.startDate).getTime();
          const newStartDate = updateData.startDate
            ? new Date(updateData.startDate)
            : originalDate;
          const newEndDate = updateData.endDate
            ? new Date(updateData.endDate)
            : new Date(newStartDate.getTime() + durationMs);

          // Create a new recurring entry from this date onward
          return tx.calendarEntry.create({
            data: {
              userId,
              title: updateData.title ?? parent.title,
              startDate: newStartDate,
              endDate: newEndDate,
              content:
                updateData.content !== undefined
                  ? updateData.content
                  : parent.content,
              wholeDay:
                updateData.wholeDay !== undefined
                  ? updateData.wholeDay
                  : parent.wholeDay,
              recurrenceFrequency:
                updateData.recurrenceFrequency ?? parent.recurrenceFrequency,
              recurrenceByDay:
                updateData.recurrenceByDay !== undefined
                  ? updateData.recurrenceByDay
                  : parent.recurrenceByDay,
              recurrenceUntil: parent.recurrenceUntil,
            },
          });
        });

        this.logger.log(
          `Recurring entry updated (THIS_AND_FUTURE): ${parentId} split at ${originalDate.toISOString()}, new entry ${result.id}`,
        );
        return result;
      }
    }
  }

  private async removeRecurringEntry(
    userId: string,
    id: string,
    scope: EditScope | undefined,
  ) {
    const parsed = isSyntheticId(id) ? parseSyntheticId(id) : null;
    const parentId = parsed ? parsed.parentId : id;
    const originalDate = parsed ? parsed.originalDate : null;

    const effectiveScope = scope ?? EditScope.ALL;

    const parent = await this.prismaService.calendarEntry.findUnique({
      where: { userId, id: parentId },
    });

    if (!parent) {
      throw new NotFoundException(t('error.calendarEntryNotFound'));
    }

    switch (effectiveScope) {
      case EditScope.ALL: {
        const entry = await this.prismaService.calendarEntry.delete({
          where: { userId, id: parentId },
        });
        this.logger.log(`Recurring entry deleted (ALL): ${parentId}`);
        return entry;
      }

      case EditScope.SINGLE: {
        if (!originalDate) {
          throw new BadRequestException(t('error.invalidOccurrenceId'));
        }

        await this.prismaService.recurrenceException.upsert({
          where: {
            calendarEntryId_originalDate: {
              calendarEntryId: parentId,
              originalDate,
            },
          },
          create: {
            calendarEntryId: parentId,
            originalDate,
            isCancelled: true,
          },
          update: {
            isCancelled: true,
          },
        });

        this.logger.log(
          `Recurring entry deleted (SINGLE): ${parentId} occurrence ${originalDate.toISOString()}`,
        );
        return { message: t('success.calendarOccurrenceDeleted') };
      }

      case EditScope.THIS_AND_FUTURE: {
        if (!originalDate) {
          throw new BadRequestException(t('error.invalidOccurrenceId'));
        }

        // If deleting from the first occurrence, it's equivalent to ALL
        if (originalDate.getTime() === new Date(parent.startDate).getTime()) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return this.removeRecurringEntry(userId, parentId, EditScope.ALL);
        }

        const dayBefore = new Date(originalDate);
        dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

        await this.prismaService.$transaction(async (tx) => {
          await tx.calendarEntry.update({
            where: { userId, id: parentId },
            data: { recurrenceUntil: dayBefore },
          });

          await tx.recurrenceException.deleteMany({
            where: {
              calendarEntryId: parentId,
              originalDate: { gte: originalDate },
            },
          });
        });

        this.logger.log(
          `Recurring entry deleted (THIS_AND_FUTURE): ${parentId} from ${originalDate.toISOString()}`,
        );
        return { message: t('success.calendarOccurrenceDeleted') };
      }
    }
  }
}
