import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get('summary')
  summary() {
    return this.svc.summary();
  }

  @Get('ranking')
  ranking(@Query('limit') limit?: string) {
    return this.svc.ranking(limit ? Math.min(Number(limit), 200) : 50);
  }

  @Get('sales')
  sales(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.sales(from, to);
  }

  @Get('categories')
  categories(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.categories(from, to);
  }

  @Get('items')
  items(
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.topItems(limit ? Math.min(Number(limit), 50) : 10, from, to);
  }
}
