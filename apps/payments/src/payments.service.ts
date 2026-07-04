import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { NOTIFICATIONS_SERVICE_NAME, NotificationsServiceClient } from '@app/common';
import type { ClientGrpc} from '@nestjs/microservices';
import { PaymentsCreateChargeDto } from './dto/payments-create-charge.dto';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private notificationsService: NotificationsServiceClient;

  constructor(
    private readonly configService: ConfigService, 
    @Inject(NOTIFICATIONS_SERVICE_NAME) private readonly client: ClientGrpc
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY')!, { apiVersion: '2026-02-25.clover' });
  }
  
  async createCharge({ paymentMethodId, amount, email }: PaymentsCreateChargeDto) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      payment_method: paymentMethodId,
      amount: amount * 100,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      currency: 'usd'
    });

    if(!this.notificationsService) {
      this.notificationsService = 
        this.client.getService<NotificationsServiceClient>(NOTIFICATIONS_SERVICE_NAME);
    }

    this.notificationsService.notifyEmail({ 
      email, 
      text: `Your payment of $${amount} has been successfully processed!` 
    }).subscribe(()=>{});

    return paymentIntent;
  }
}
