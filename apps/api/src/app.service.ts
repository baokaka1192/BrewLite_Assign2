import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  hello() {
    return { message: 'Hello from BrewLite API', version: '0.1.0' };
  }

  health() {
    // APP_VERSION is the commit SHA baked into the image by CD, so a smoke test can tell the new deploy is live.
    return { status: 'ok', uptime: Math.round(process.uptime()), version: process.env.APP_VERSION ?? 'dev' };
  }
}
