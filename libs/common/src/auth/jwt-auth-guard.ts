import { CanActivate, ExecutionContext, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { catchError, map, Observable, of, tap } from "rxjs";
import { AUTH_SERVICE } from "../constants/services";
import { ClientProxy } from "@nestjs/microservices";
import { UserDto } from "../dto";
import { Reflector } from "@nestjs/core";

@Injectable()
export class JwtAuthGuard implements CanActivate { 
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor (
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly reflector: Reflector
  ) {}
  
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const jwt = context.switchToHttp().getRequest().cookies?.Authentication;

    if (!jwt) {
      return false;
    }

    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    return this.authClient.send<UserDto>('authenticate', {
      Authentication: jwt
    }).pipe(
      tap((res) => {
        if (requiredRoles) {
          for (const role of requiredRoles || []) {
            if (!res.roles?.includes(role)) {
              this.logger.warn(`User ${res._id} does not have required role: ${role}`);
              throw new UnauthorizedException('Insufficient role');
            }
          }
        } 
        context.switchToHttp().getRequest().user = res;
      }),
      map(() => true),
      catchError((err) => {
        this.logger.error('Authentication error', err);
        return of(false);
      })
    );
  }
}