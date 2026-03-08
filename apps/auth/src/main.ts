import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  const configService = app.get(ConfigService);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_PORT') ?? 3002
    }
  });
  await app.startAllMicroservices();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));
  app.useLogger(app.get(Logger));
  await app.listen(configService.get<number>('HTTP_PORT') ?? 3000);
}
bootstrap();
