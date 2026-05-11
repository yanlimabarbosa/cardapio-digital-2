import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

function isAllowedLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      /^[0-9.]+$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
  app.setGlobalPrefix('api');

  const allowedOrigins = new Set((process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((origin) => origin.trim()).filter(Boolean));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || isAllowedLocalOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin ${origin}`), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
