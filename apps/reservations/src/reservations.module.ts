import { Module } from '@nestjs/common';
import { DatabaseModule, LoggerModule } from '@app/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationsRepository } from './reservations.repository';
import { ReservationSchema } from './models/reservation.schema';

@Module({
  imports: [
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: 'ReservationDocument', schema: ReservationSchema },
    ]),
    LoggerModule
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService, 
    ReservationsRepository
  ],
})
export class ReservationsModule {}
