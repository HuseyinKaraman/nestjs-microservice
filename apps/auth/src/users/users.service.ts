import { Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs'
import { GetUserDto } from './dto/get-user.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    await this.validateCreateUserDto(createUserDto);
    return this.prismaService.user.create({
      data:{
        email: createUserDto.email,
        password: await bcrypt.hash(createUserDto.password, 10),
        roles: createUserDto.roles || [],
      }
    });
  }

  private async validateCreateUserDto(createUserDto: CreateUserDto) {
    try {  
      await this.prismaService.user.findFirstOrThrow({
        where: { email: createUserDto.email }
      });
    } catch (error) {
      return;
    }
    throw new UnprocessableEntityException('Email already exists');
  }

  async validateUser(email: string, password: string) {
    const user = await this.prismaService.user.findFirstOrThrow({
      where: { email }
    });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async getUser(getUserDto: GetUserDto) {
    return this.prismaService.user.findUniqueOrThrow({
      where: { id: +getUserDto.id }
    });
  }
}
