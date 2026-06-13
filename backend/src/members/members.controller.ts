import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AdminPayload } from '../auth/auth.service';
import { CurrentAdmin, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMemberDto } from './dto/create-member.dto';
import { SearchMembersDto } from './dto/search-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@UseGuards(JwtAuthGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly svc: MembersService) {}

  @Get()
  search(@Query() q: SearchMembersDto) {
    return this.svc.search(q.q ?? '');
  }

  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.svc.create(dto);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemberDto,
    @CurrentAdmin() admin: AdminPayload,
  ) {
    return this.svc.update(id, dto, admin.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.softDelete(id);
  }

  @Get(':id/history')
  history(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getHistory(id);
  }

  @Get(':id/payments')
  payments(@Param('id', ParseIntPipe) id: number) {
    return this.svc.listPayments(id);
  }
}
