import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { t } from 'src/common/utils/i18n';

const MAX_CALENDARS_PER_USER = 5;

@Injectable()
export class CalendarsService {
  private readonly logger = new Logger(CalendarsService.name);

  constructor(private prismaService: PrismaService) {}

  async create(userId: string, createCalendarDto: CreateCalendarDto) {
    const count = await this.prismaService.calendar.count({
      where: { userId },
    });

    if (count >= MAX_CALENDARS_PER_USER) {
      throw new BadRequestException(t('error.maxCalendarsReached'));
    }

    const calendar = await this.prismaService.calendar.create({
      data: {
        userId,
        ...createCalendarDto,
      },
    });
    this.logger.log(`Calendar created: ${calendar.id} for user ${userId}`);
    return calendar;
  }

  async findAll(userId: string) {
    return this.prismaService.calendar.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const calendar = await this.prismaService.calendar.findUnique({
      where: { userId, id },
    });

    if (!calendar) {
      this.logger.error(`Calendar not found: ${id} for user ${userId}`);
      throw new NotFoundException(t('error.calendarNotFound'));
    }

    return calendar;
  }

  async update(
    userId: string,
    id: string,
    updateCalendarDto: UpdateCalendarDto,
  ) {
    await this.findOne(userId, id);

    const calendar = await this.prismaService.calendar.update({
      where: { userId, id },
      data: updateCalendarDto,
    });
    this.logger.log(`Calendar updated: ${id}`);
    return calendar;
  }

  async remove(userId: string, id: string, deleteEntries?: boolean) {
    await this.findOne(userId, id);

    if (deleteEntries) {
      await this.prismaService.$transaction(async (tx) => {
        await tx.calendarEntry.deleteMany({
          where: { userId, calendarId: id },
        });
        await tx.calendar.delete({
          where: { userId, id },
        });
      });
      this.logger.log(
        `Calendar deleted with entries: ${id} for user ${userId}`,
      );
    } else {
      await this.prismaService.calendar.delete({
        where: { userId, id },
      });
      this.logger.log(`Calendar deleted: ${id} for user ${userId}`);
    }
  }
}
