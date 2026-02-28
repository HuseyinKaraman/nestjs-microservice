import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto) {
    // return this.usersRepository.create(createUserDto);
    const existingUser = await this.usersRepository.find({ email: createUserDto.email });
    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // hash the password before saving the user
    // const hashedPassword = await this.usersRepository.hashPassword(createUserDto.password);
    // const user = await this.usersRepository.create({ ...createUserDto, password: hashedPassword });
    const user = await this.usersRepository.create(createUserDto);
    return user;
  }

  async signIn(createUserDto: CreateUserDto) {
    const [user] = await this.usersRepository.find({ email: createUserDto.email });
    if (!user) {
      return null;
    }

    // check if the password is correct
    // const isPasswordValid = await this.usersRepository.comparePassword(createUserDto.password, user.password);
    // if (!isPasswordValid) {
    //   return null;
    // }

    return user;
  }
}
