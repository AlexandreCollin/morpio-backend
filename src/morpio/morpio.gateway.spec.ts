import { Test, TestingModule } from '@nestjs/testing';
import { MorpioGateway } from './morpio.gateway';

describe('MorpioGateway', () => {
  let gateway: MorpioGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MorpioGateway],
    }).compile();

    gateway = module.get<MorpioGateway>(MorpioGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
