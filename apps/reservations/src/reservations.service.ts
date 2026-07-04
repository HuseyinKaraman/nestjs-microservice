import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationsRepository } from './reservations.repository';
import { PAYMENTS_SERVICE_NAME, PaymentsServiceClient, UserDto } from '@app/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { map } from 'rxjs';

@Injectable()
export class ReservationsService implements OnModuleInit {
  private paymentService: PaymentsServiceClient;
  
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    @Inject(PAYMENTS_SERVICE_NAME) private readonly client: ClientGrpc
  ) {}
  
  onModuleInit() {
    this.paymentService = this.client.getService<PaymentsServiceClient>(PAYMENTS_SERVICE_NAME);
  }

  async create(createReservationDto: CreateReservationDto, { email, _id:userId } : UserDto) {
    return this.paymentService
    .createCharge({
      ...createReservationDto.charge,
      email
    })
    .pipe(map((res) => {
      return this.reservationsRepository.create({
        ...createReservationDto,
        invoiceId: res.id,
        timestamp: new Date(),
        userId
      });
    }));
  }

  async findAll() {
    return this.reservationsRepository.find({});
  }

  async findOne(_id: string) {
    return this.reservationsRepository.findOne({ _id });
  }

  async update(_id: string, updateReservationDto: UpdateReservationDto) {
    return this.reservationsRepository.findOneAndUpdate(
      { _id }, 
      { $set: updateReservationDto }
    );
  }

  async remove(_id: string) {
    return this.reservationsRepository.findOneAndDelete({ _id });
  }
}
