import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

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
