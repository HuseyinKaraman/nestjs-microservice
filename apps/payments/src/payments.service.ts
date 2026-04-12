import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateChargeDto } from '@app/common';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
      {
        apiVersion: '2026-02-25.clover',
      },
    );
  }
  
  async createCharge({ paymentMethodId, amount }: CreateChargeDto) {
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
    return paymentIntent;
  }
}
