import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 (React Native 개발 서버 허용)
  app.enableCors({
    origin: true, // 개발 환경에서는 모든 origin 허용
    credentials: true,
  });

  // 전역 ValidationPipe (class-validator DTO 검증 자동 적용)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // DTO에 정의되지 않은 속성 자동 제거
      forbidNonWhitelisted: true, // 허용되지 않은 속성이 있으면 400 에러
      transform: true,          // 자동 타입 변환 (string → number 등)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 WEPL Backend running on http://localhost:${port}`);
}
bootstrap();

