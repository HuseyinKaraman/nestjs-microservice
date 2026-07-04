import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { CreateChargeMessage } from "../types";

export class CreateChargeDto implements Omit<CreateChargeMessage, 'email'> {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
