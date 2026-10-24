import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  hello() {
    return { message: 'Hello from BrewLite API', version: '0.1.0' };
  }

  health() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }
}
