import { IsOptional, IsString } from 'class-validator';

export class SearchMembersDto {
  @IsOptional()
  @IsString()
  q?: string;
}
