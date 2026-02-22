import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule as NestConfigModule } from '@nestjs/config';
import Joi from 'joi';

@Module({
  imports : [NestConfigModule.forRoot({
    validationSchema: Joi.object({
      NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      PORT: Joi.number().default(3000),
      MONGODB_URI: Joi.string().required(),
    }),
  })],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
