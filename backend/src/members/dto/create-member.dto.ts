import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  point?: number;

  @IsOptional()
  @IsString()
  memo?: string;
}
