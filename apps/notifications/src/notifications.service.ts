import { Injectable } from '@nestjs/common';
import { NotifyEmailDto } from './dto/notify-email.dto';

@Injectable()
export class NotificationsService {
  async sendEmailNotification({ email }: NotifyEmailDto) {
    console.log(`Sending email notification to ${email}`);
  }
}
