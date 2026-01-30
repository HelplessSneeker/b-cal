import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetCalendarEntriesDto } from './dto/get-calendar-entries.dto';

@Injectable()
export class CalendarService {
  constructor(private prismaService: PrismaService) {}

  async create(userId: string, createCalendarDto: CreateCalendarDto) {
    return await this.prismaService.calenderEntry.create({
      data: {
        userId,
        ...createCalendarDto,
      },
    });
  }

  findAll(userId: string, getCalendarEntriesDto: GetCalendarEntriesDto) {
    const { startDate, endDate } = getCalendarEntriesDto;

    return this.prismaService.calenderEntry.findMany({
      where: {
        userId,
        ...(startDate && { endDate: { gte: startDate } }),
        ...(endDate && { startDate: { lte: endDate } }),
      },
    });
  }

  async findOne(userId: string, id: string) {
    const entry = await this.prismaService.calenderEntry.findUnique({
      where: {
        userId,
        id,
      },
    });

    if (!entry) {
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
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    return await this.prismaService.calenderEntry.update({
      where: {
        userId,
        id,
      },
      data: {
        ...updateCalendarDto,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return await this.prismaService.calenderEntry.delete({
      where: {
        userId,
        id,
      },
    });
  }
}
