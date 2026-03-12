import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { DeleteCalendarDto } from './dto/delete-calendar.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { EmailVerifiedGuard } from 'src/auth/guard/email-verified.guard';
import { User } from 'src/auth/decorators/user.decorator';
import { GetCalendarEntriesDto } from './dto/get-calendar-entries.dto';
import { t } from 'src/common/utils/i18n';

@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  async create(
    @User('id') userId: string,
    @Body() createCalendarDto: CreateCalendarDto,
  ) {
    const entry = await this.calendarService.create(userId, createCalendarDto);

    return { message: t('success.calendarEntryCreated'), data: entry };
  }

  @Get()
  async findAll(
    @User('id') userId: string,
    @Query() getCalendarEntriesDto: GetCalendarEntriesDto,
  ) {
    const calendarEntries = await this.calendarService.findAll(
      userId,
      getCalendarEntriesDto,
    );

    return { data: calendarEntries };
  }

  @Get(':id')
  async findOne(@User('id') userId: string, @Param('id') id: string) {
    const calendarEntry = await this.calendarService.findOne(userId, id);

    return { data: calendarEntry };
  }

  @Patch(':id')
  async update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() updateCalendarDto: UpdateCalendarDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const entry = await this.calendarService.update(
      userId,
      id,
      updateCalendarDto,
    );

    return {
      message: t('success.calendarEntryUpdated'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: entry,
    };
  }

  @Delete(':id')
  async remove(
    @User('id') userId: string,
    @Param('id') id: string,
    @Query() deleteCalendarDto: DeleteCalendarDto,
  ) {
    await this.calendarService.remove(userId, id, deleteCalendarDto.scope);

    return { message: t('success.calendarEntryDeleted') };
  }
}
