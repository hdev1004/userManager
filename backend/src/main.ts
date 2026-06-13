import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, isAbsolute } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const corsOrigin = config.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : true,
    credentials: true,
  });

  const uploadRoot = config.get<string>('UPLOAD_ROOT') ?? './uploads';
  const uploadAbs = isAbsolute(uploadRoot)
    ? uploadRoot
    : join(process.cwd(), '..', uploadRoot);
  app.useStaticAssets(uploadAbs, { prefix: '/static' });

  app.setGlobalPrefix('api');

  const port = Number(config.get<string>('PORT')) || 3000;
  await app.listen(port);
  console.log(`Backend listening on http://localhost:${port}`);
  console.log(`Static uploads served from: ${uploadAbs} → /static`);
}
bootstrap();
