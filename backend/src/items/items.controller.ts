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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateItemDto,
  ReorderItemsDto,
  UpdateItemDto,
} from './dto/item.dto';
import { ItemsService } from './items.service';

@UseGuards(JwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly svc: ItemsService) {}

  @Get()
  list(@Query('categoryId') categoryId?: string) {
    return this.svc.list(categoryId ? Number(categoryId) : undefined);
  }

  @Get('search')
  search(@Query('q') q?: string) {
    return this.svc.search(q ?? '');
  }

  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.svc.create(dto);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderItemsDto) {
    return this.svc.reorder(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }
}
