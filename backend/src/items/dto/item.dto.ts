import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @IsInt()
  category_id!: number;

  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(50)
  name!: string;

  @IsInt()
  @Min(0)
  price!: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsInt()
  category_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

class ReorderItem {
  @IsInt()
  id!: number;

  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderItemsDto {
  @IsInt()
  category_id!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  orders!: ReorderItem[];
}
