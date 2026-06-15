import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AdminPayload } from '../auth/auth.service';
import { CurrentAdmin, JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Post()
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentAdmin() admin: AdminPayload,
  ) {
    return this.svc.create(dto, admin.sub);
  }

  // 주의: ':id' 보다 먼저 정의되어야 함
  @Get('by-date')
  byDate(@Query('date') date: string) {
    if (!date) throw new BadRequestException('date 쿼리(YYYY-MM-DD)가 필요합니다.');
    return this.svc.listByDate(date);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('파일이 비어 있습니다.');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('이미지 파일만 업로드 가능합니다.');
    }
    return this.svc.addImage(id, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    });
  }

  @Delete(':id/images/:imgId')
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imgId', ParseIntPipe) imgId: number,
  ) {
    return this.svc.removeImage(id, imgId);
  }
}
