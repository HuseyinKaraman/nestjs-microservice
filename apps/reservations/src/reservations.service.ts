import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { PAYMENTS_SERVICE_NAME, PaymentsServiceClient, User } from '@app/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { map } from 'rxjs';
import { PrismaService } from './prisma.service';

@Injectable()
export class ReservationsService implements OnModuleInit {
  private paymentService: PaymentsServiceClient;
  
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(PAYMENTS_SERVICE_NAME) private readonly client: ClientGrpc
  ) {}
  
  onModuleInit() {
    this.paymentService = this.client.getService<PaymentsServiceClient>(PAYMENTS_SERVICE_NAME);
  }

  async create(createReservationDto: CreateReservationDto, { email, id:userId } : User) {
    return this.paymentService
    .createCharge({
      ...createReservationDto.charge,
      email
    })
    .pipe(map((res) => {
      return this.prismaService.reservation.create({
        data: {
          startDate: createReservationDto.startDate,
          endDate: createReservationDto.endDate,
          invoiceId: res.id,
          timestamp: new Date(),
          userId: +userId
        }
      });
    }));
  }

  async findAll() {
    return this.prismaService.reservation.findMany({});
  }

  async findOne(id: number) {
    return this.prismaService.reservation.findUniqueOrThrow(
      { where: { id} }
    );
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    return this.prismaService.reservation.update({ 
      where: { id }, 
      data: updateReservationDto 
    });
  }

  async remove(id: number) {
    return this.prismaService.reservation.delete({ where: { id } });
  }
}
