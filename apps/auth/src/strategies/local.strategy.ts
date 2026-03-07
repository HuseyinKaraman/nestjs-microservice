import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { UsersService } from "../users/users.service";
import { Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({ usernameField:'email'});
  }

  async validate(username: string, password: string): Promise<any> {
    try {
      return await this.usersService.validateUser(username, password);
    } catch (err) {
      throw new UnauthorizedException(err);
    }
  }
}