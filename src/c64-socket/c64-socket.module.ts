import { Module } from '@nestjs/common';
import { C64SocketGateway } from './c64-socket.gateway';

@Module({
  providers: [C64SocketGateway],
  exports: [C64SocketGateway],
})
export class C64SocketModule {}
