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
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { User } from 'src/auth/decorators/user.decorator';
import { GetCalendarEntriesDto } from './dto/get-calendar-entries.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @User('id') userId: string,
    @Body() createCalendarDto: CreateCalendarDto,
  ) {
    const calendar = await this.calendarService.create(
      userId,
      createCalendarDto,
    );

    return { message: `Calendar entry with id ${calendar.id} created` };
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@User('id') userId: string, @Param('id') id: string) {
    const calendarEntry = await this.calendarService.findOne(userId, id);

    return { data: calendarEntry };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() updateCalendarDto: UpdateCalendarDto,
  ) {
    const calendarEntry = await this.calendarService.update(
      userId,
      id,
      updateCalendarDto,
    );

    return {
      message: `Calander entry with id ${calendarEntry.id} has been updated`,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@User('id') userId: string, @Param('id') id: string) {
    const calendarEntry = await this.calendarService.remove(userId, id);

    return { message: `Deletd Calendar entry with id ${calendarEntry.id}` };
  }
}
