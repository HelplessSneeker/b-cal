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
import { CalendarsService } from './calendars.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { DeleteCalendarDto } from './dto/delete-calendar.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { EmailVerifiedGuard } from 'src/auth/guard/email-verified.guard';
import { User } from 'src/auth/decorators/user.decorator';
import { t } from 'src/common/utils/i18n';

@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Controller('calendars')
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Post()
  async create(
    @User('id') userId: string,
    @Body() createCalendarDto: CreateCalendarDto,
  ) {
    const calendar = await this.calendarsService.create(
      userId,
      createCalendarDto,
    );

    return { message: t('success.calendarCreated'), data: calendar };
  }

  @Get()
  async findAll(@User('id') userId: string) {
    const calendars = await this.calendarsService.findAll(userId);

    return { data: calendars };
  }

  @Get(':id')
  async findOne(@User('id') userId: string, @Param('id') id: string) {
    const calendar = await this.calendarsService.findOne(userId, id);

    return { data: calendar };
  }

  @Patch(':id')
  async update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() updateCalendarDto: UpdateCalendarDto,
  ) {
    const calendar = await this.calendarsService.update(
      userId,
      id,
      updateCalendarDto,
    );

    return { message: t('success.calendarUpdated'), data: calendar };
  }

  @Delete(':id')
  async remove(
    @User('id') userId: string,
    @Param('id') id: string,
    @Query() deleteCalendarDto: DeleteCalendarDto,
  ) {
    await this.calendarsService.remove(
      userId,
      id,
      deleteCalendarDto.deleteEntries,
    );

    return { message: t('success.calendarDeleted') };
  }
}
