import { CanActivate, ExecutionContext, Inject, Injectable, Logger, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { catchError, map, Observable, of, tap } from "rxjs";
import { UserDto } from "../dto";
import { Reflector } from "@nestjs/core";
import { AUTH_SERVICE_NAME, AuthServiceClient } from "../types";
import type { ClientGrpc } from "@nestjs/microservices";

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit { 
  private readonly logger = new Logger(JwtAuthGuard.name);
  private authService: AuthServiceClient;

  constructor (
    @Inject(AUTH_SERVICE_NAME) private readonly client: ClientGrpc,
    private readonly reflector: Reflector
  ) {}
  
  onModuleInit() {
    this.authService = 
      this.client.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
  }
  
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const jwt = context.switchToHttp().getRequest().cookies?.Authentication;

    if (!jwt) {
      return false;
    }

    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    return this.authService
      .authenticate({
        Authentication: jwt 
      })
      .pipe(
        tap((res) => {
          if (requiredRoles) {
            for (const role of requiredRoles || []) {
              if (!res.roles?.includes(role)) {
                this.logger.warn(`User ${res.id} does not have required role: ${role}`);
                throw new UnauthorizedException('Insufficient role');
              }
            }
          } 
        context.switchToHttp().getRequest().user = {
          ...res,
          _id: res.id
        }
      }),
      map(() => true),
      catchError((err) => {
        this.logger.error('Authentication error', err);
        return of(false);
      })
    );
  }
}