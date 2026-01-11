import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { C64SocketModule } from '../c64-socket/c64-socket.module';

@Module({
  imports: [C64SocketModule],
  controllers: [ApiController],
})
export class ApiModule {}
