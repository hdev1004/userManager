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

export class CreateCategoryDto {
  @IsString()
  @MaxLength(10)
  code!: string;

  @IsString()
  @MaxLength(30)
  name!: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;
}

class ReorderItem {
  @IsInt()
  id!: number;

  @IsInt()
  @Min(0)
  sort_order!: number;
}

export class ReorderCategoriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  orders!: ReorderItem[];
}
