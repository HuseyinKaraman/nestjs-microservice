import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { PaymentsCreateChargeDto } from './dto/payments-create-charge.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern('create_charge')
  @UsePipes(new ValidationPipe())
  async createCharge(@Payload() data: PaymentsCreateChargeDto, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const paymentIntent = await this.paymentsService.createCharge(data);
      channel.ack(originalMsg);
      return paymentIntent;
    } catch (error) {
      channel.nack(originalMsg, false, false);
      throw error;
    }
  }
}
