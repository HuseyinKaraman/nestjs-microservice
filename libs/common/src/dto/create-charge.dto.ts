import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateChargeDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
