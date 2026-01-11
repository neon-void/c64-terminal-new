import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PetsciiModule } from './petscii/petscii.module';
import { PusherModule } from './pusher/pusher.module';
import { MessageModule } from './message/message.module';
import { C64SocketModule } from './c64-socket/c64-socket.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    PetsciiModule,
    PusherModule,
    MessageModule,
    C64SocketModule,
    ApiModule,
  ],
})
export class AppModule {}
