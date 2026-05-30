import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
