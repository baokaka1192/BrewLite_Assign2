import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    controller = moduleRef.get(AppController);
  });

  it('returns hello message', () => {
    expect(controller.hello().message).toContain('BrewLite');
  });

  it('reports health ok', () => {
    expect(controller.health().status).toBe('ok');
  });
});
