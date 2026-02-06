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

  findAll(userId: string, getCalendarEntriesDto: GetCalendarEntriesDto) {
    const { startDate, endDate } = getCalendarEntriesDto;

    return this.prismaService.calendarEntry.findMany({
      where: {
        userId,
        ...(startDate && { endDate: { gte: startDate } }),
        ...(endDate && { startDate: { lte: endDate } }),
      },
    });
  }

  async findOne(userId: string, id: string) {
    const entry = await this.prismaService.calendarEntry.findUnique({
      where: {
        userId,
        id,
      },
    });

    if (!entry) {
      this.logger.error(`Calendar entry not found: ${id} for user ${userId}`);
      throw new NotFoundException(`Calendar entry with id ${id} not found`);
    }

    return entry;
  }

  async update(
    userId: string,
    id: string,
    updateCalendarDto: UpdateCalendarDto,
  ) {
    const existingEntry = await this.findOne(userId, id);

    const startDate = new Date(
      updateCalendarDto.startDate ?? existingEntry.startDate,
    );
    const endDate = new Date(
      updateCalendarDto.endDate ?? existingEntry.endDate,
    );

    if (startDate > endDate) {
      this.logger.error(
        `Calendar entry update failed: invalid date range for ${id}`,
      );
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const entry = await this.prismaService.calendarEntry.update({
      where: {
        userId,
        id,
      },
      data: {
        ...updateCalendarDto,
      },
    });
    this.logger.log(`Calendar entry updated: ${id}`);
    return entry;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    const entry = await this.prismaService.calendarEntry.delete({
      where: {
        userId,
        id,
      },
    });
    this.logger.log(`Calendar entry deleted: ${id}`);
    return entry;
  }
}
