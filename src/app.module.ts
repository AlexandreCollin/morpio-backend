import { Module } from '@nestjs/common';
import { MorpioGateway } from './morpio/morpio.gateway';
import { MorpioGameService } from './morpio/morpio.service';

@Module({
  imports: [],
  controllers: [],
  providers: [MorpioGateway, MorpioGameService],
})
export class AppModule {}
