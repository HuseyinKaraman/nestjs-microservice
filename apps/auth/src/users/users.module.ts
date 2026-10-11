import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { LoggerModule} from '@app/common';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    LoggerModule
  ],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService]
})
export class UsersModule {}
