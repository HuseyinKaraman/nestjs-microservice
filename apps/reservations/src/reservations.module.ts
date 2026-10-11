import { Module } from '@nestjs/common';
import { LoggerModule, HealthModule, AUTH_PACKAGE_NAME, PAYMENTS_PACKAGE_NAME, AUTH_SERVICE_NAME, PAYMENTS_SERVICE_NAME } from '@app/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({ 
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required()
      }),
    }),
    ClientsModule.registerAsync([
      { 
        name: AUTH_SERVICE_NAME, 
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_PACKAGE_NAME,
            protoPath: join(__dirname,'../../../proto/auth.proto'),
            url: configService.getOrThrow('AUTH_GRPC_URL')
          },
        }),
        inject: [ConfigService],
      },
      { 
        name: PAYMENTS_SERVICE_NAME, 
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: PAYMENTS_PACKAGE_NAME,
            protoPath: join(__dirname,'../../../proto/payments.proto'),
            url: configService.getOrThrow('PAYMENTS_GRPC_URL')
          },
        }),
        inject: [ConfigService],
      },
    ]),
    HealthModule
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    PrismaService
  ],
})
export class ReservationsModule {}