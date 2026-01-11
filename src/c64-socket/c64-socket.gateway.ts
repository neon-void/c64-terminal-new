import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as net from 'net';
import { ClientSessionManager, ClientSession } from './client-session';
import { MessageService } from '../message/message.service';
import {
  PusherService,
  CHAT_MESSAGE_EVENT,
  PUSHER_STATUS_EVENT,
} from '../pusher/pusher.service';
import { StreamScannerChatMessage } from '../pusher/pusher.types';

// Transmission rate: 10 characters per 100ms (matches C64 baud rate)
const TRANSMISSION_INTERVAL_MS = 100;
// Status message interval: 2 minutes
const STATUS_MESSAGE_INTERVAL_MS = 2 * 60 * 1000;

@Injectable()
export class C64SocketGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(C64SocketGateway.name);
  private server: net.Server | null = null;
  private readonly sessionManager = new ClientSessionManager();
  private allowedIps: string[] = ['127.0.0.1'];
  private startTime: Date = new Date();

  constructor(
    private readonly configService: ConfigService,
    private readonly messageService: MessageService,
    private readonly pusherService: PusherService,
  ) {}

  onModuleInit() {
    // Parse allowed IPs from config
    const allowedIpsConfig = this.configService.get<string>(
      'ALLOWED_IPS',
      '127.0.0.1',
    );
    this.allowedIps = allowedIpsConfig.split(',').map((ip) => ip.trim());
    this.logger.log(`Allowed IPs: ${this.allowedIps.join(', ')}`);

    this.startServer();
    this.startTime = new Date();
  }

  onModuleDestroy() {
    this.stopServer();
  }

  private get tcpPort(): number {
    return this.configService.get<number>('TCP_PORT', 10000);
  }

  private startServer(): void {
    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    this.server.on('error', (err) => {
      this.logger.error('TCP Server error', err);
    });

    this.server.listen(this.tcpPort, '0.0.0.0', () => {
      this.logger.log(`C64 Terminal Server listening on port ${this.tcpPort}`);
    });
  }

  private stopServer(): void {
    this.sessionManager.disconnectAll();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private handleConnection(socket: net.Socket): void {
    const address = `${socket.remoteAddress}:${socket.remotePort}`;
    const ip = this.extractIp(socket.remoteAddress || '');

    this.logger.log(`[${address}] connected`);

    // Check IP whitelist
    if (!this.isIpAllowed(ip)) {
      this.logger.warn(`[${address}] IP not allowed, closing connection`);
      socket.destroy();
      return;
    }

    // Set socket options
    socket.setNoDelay(true);

    // Create session
    const session = this.sessionManager.add(socket);

    // Check Pusher connection and trigger reconnect if needed
    if (!this.pusherService.isConnected && !this.pusherService.isConnecting) {
      this.pusherService.connect();
    }

    // Send welcome message after a short delay
    setTimeout(() => {
      const welcomeMessage = this.messageService.getWelcomeMessage('0001');
      this.sessionManager.addToBuffer(address, welcomeMessage);
    }, 500);

    // Start the transmission loop
    this.startTransmissionLoop(session);

    // Handle socket events
    socket.on('data', () => {
      // We can handle incoming data from C64 here if needed
    });

    socket.on('close', () => {
      this.logger.log(`[${address}] disconnected`);
      this.sessionManager.remove(address);
    });

    socket.on('error', (err) => {
      this.logger.error(`[${address}] socket error`, err);
      this.sessionManager.remove(address);
    });
  }

  private extractIp(remoteAddress: string): string {
    // Handle IPv6-mapped IPv4 addresses (::ffff:127.0.0.1)
    if (remoteAddress.startsWith('::ffff:')) {
      return remoteAddress.substring(7);
    }
    return remoteAddress;
  }

  private isIpAllowed(ip: string): boolean {
    return this.allowedIps.includes(ip);
  }

  private startTransmissionLoop(session: ClientSession): void {
    const transmit = () => {
      const currentSession = this.sessionManager.get(session.address);
      if (!currentSession) {
        return; // Session was removed
      }

      // Send next character from buffer if available
      if (currentSession.buffer.length > 0) {
        const charCode = currentSession.buffer.shift()!;
        try {
          currentSession.socket.write(Buffer.from([charCode]));
        } catch {
          // Socket might be closed
          this.sessionManager.remove(session.address);
          return;
        }
      } else {
        // Check if we should send ephemeral status message
        const timeSinceStatus =
          Date.now() - currentSession.lastStatusMessage.getTime();
        if (timeSinceStatus > STATUS_MESSAGE_INTERVAL_MS) {
          currentSession.lastStatusMessage = new Date();
          const ephemeralMsg = this.messageService.getEphemeralMessage();
          this.sessionManager.addToBuffer(session.address, ephemeralMsg);
        }
      }

      // Schedule next transmission
      currentSession.timer = setTimeout(transmit, TRANSMISSION_INTERVAL_MS);
    };

    // Start the loop
    transmit();
  }

  // Event handlers for Pusher events
  @OnEvent(CHAT_MESSAGE_EVENT)
  handleChatMessage(data: StreamScannerChatMessage): void {
    const parsed = this.messageService.parseMessage(data);
    const formatted = this.messageService.formatForC64(parsed);

    if (formatted) {
      this.logger.log(`Broadcasting message from ${parsed.userName}`);
      this.sessionManager.broadcastToAll(formatted);
    }
  }

  @OnEvent(PUSHER_STATUS_EVENT)
  handlePusherStatus(data: { connected: boolean }): void {
    const statusMsg = this.messageService.getPusherStatusMessage(
      data.connected,
    );
    this.sessionManager.broadcastToAll(statusMsg);
  }

  @OnEvent('pusher.reconnecting')
  handlePusherReconnecting(): void {
    const reconnectMsg = this.messageService.getReconnectingMessage();
    this.sessionManager.broadcastToAll(reconnectMsg);
  }

  // Public methods for API access
  getClientCount(): number {
    return this.sessionManager.count();
  }

  getClients(): Array<{ address: string; openTime: Date }> {
    return this.sessionManager.toJSON();
  }

  disconnectAllClients(): number {
    return this.sessionManager.disconnectAll();
  }

  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  getStartTime(): Date {
    return this.startTime;
  }
}
