import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentItemDto {
  @IsOptional()
  @IsInt()
  item_id?: number;

  @IsString()
  @MaxLength(50)
  item_name!: string;

  @IsInt()
  @Min(0)
  unit_price!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreatePaymentDto {
  @IsInt()
  member_id!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items!: PaymentItemDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  point_used?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  point_earned?: number;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items?: PaymentItemDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  point_used?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  point_earned?: number;

  @IsOptional()
  @IsString()
  memo?: string;
}
