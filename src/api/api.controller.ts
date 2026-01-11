import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { C64SocketGateway } from '../c64-socket/c64-socket.gateway';
import { PusherService } from '../pusher/pusher.service';

@Controller()
export class ApiController {
  constructor(
    private readonly configService: ConfigService,
    private readonly c64Gateway: C64SocketGateway,
    private readonly pusherService: PusherService,
  ) {}

  @Get()
  getStatus() {
    return {
      status: 'ok',
      currentTime: Date.now(),
      uptime: this.c64Gateway.getUptime(),
      clients: this.c64Gateway.getClientCount(),
      messages: this.pusherService.messageCount,
      version: this.configService.get<string>('APP_VERSION', '0000'),
      pusher: {
        connected: this.pusherService.isConnected,
        connecting: this.pusherService.isConnecting,
        lastActivity: this.pusherService.lastActivity,
      },
    };
  }

  @Get('api/clients')
  getClients() {
    const clients = this.c64Gateway.getClients();
    return {
      status: 'ok',
      currentTime: Date.now(),
      clientsNumber: clients.length,
      clients,
    };
  }

  @Get('api/clients/reset')
  resetClients() {
    const count = this.c64Gateway.disconnectAllClients();
    return {
      status: 'ok',
      message: `${count} clients disconnected`,
    };
  }

  @Get('api/pusher/status')
  getPusherStatus() {
    return {
      status: 'ok',
      pusher: this.pusherService.getStatus(),
    };
  }

  @Get('api/pusher/reconnect')
  reconnectPusher() {
    const initiated = this.pusherService.forceReconnect();
    return {
      status: 'ok',
      message: initiated
        ? 'Pusher reconnection initiated'
        : 'Pusher already connected or connecting',
    };
  }
}
