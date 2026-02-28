import { Module } from '@nestjs/common';
import { DatabaseModule, LoggerModule } from '@app/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationsRepository } from './reservations.repository';
import { ReservationSchema } from './models/reservation.schema';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';

@Module({
  imports: [
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: 'ReservationDocument', schema: ReservationSchema },
    ]),
    LoggerModule,
    ConfigModule.forRoot({ 
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        MONGODB_URI: Joi.string().required(),
      }),
    })
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService, 
    ReservationsRepository
  ],
})
export class ReservationsModule {}