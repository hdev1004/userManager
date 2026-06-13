import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool, types } from 'pg';

export const PG_POOL = 'PG_POOL';

// BIGINT(int8) / NUMERIC를 JS number로 변환.
// 우리 규모(시리얼 PK, 금액·포인트)는 모두 안전한 정수 범위(2^53) 내라 안전함.
// 이걸 안 하면 pg가 모든 BIGINT를 문자열로 반환해 DTO @IsInt() 검증이 깨짐.
const INT8 = 20;
const NUMERIC = 1700;
types.setTypeParser(INT8, (val: string) => (val === null ? null : parseInt(val, 10)));
types.setTypeParser(NUMERIC, (val: string) => (val === null ? null : Number(val)));

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        return new Pool({
          host: config.get<string>('DB_HOST'),
          port: Number(config.get<string>('DB_PORT')),
          database: config.get<string>('DB_NAME'),
          user: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          max: 20,
          idleTimeoutMillis: 30_000,
          options: `-c search_path=${config.get<string>('DB_SCHEMA') ?? 'marigold'},public`,
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
