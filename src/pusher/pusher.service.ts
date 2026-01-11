import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';

import { StreamScannerChatMessage } from './pusher.types';

export const CHAT_MESSAGE_EVENT = 'chat.message';
export const PUSHER_STATUS_EVENT = 'pusher.status';

@Injectable()
export class PusherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PusherService.name);
  private client: Pusher | null = null;
  private channel: Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private _isConnected = false;
  private _isConnecting = false;
  private _lastActivity: Date | null = null;
  private _messageCount = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.connect();
    this.startHealthCheck();
  }

  onModuleDestroy() {
    this.disconnect();
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get isConnecting(): boolean {
    return this._isConnecting;
  }

  get lastActivity(): Date | null {
    return this._lastActivity;
  }

  get messageCount(): number {
    return this._messageCount;
  }

  private get pusherKey(): string {
    return this.configService.get<string>('PUSHER_KEY', '1abcdc382aa1ff65c7be');
  }

  private get pusherCluster(): string {
    return this.configService.get<string>('PUSHER_CLUSTER', 'us3');
  }

  private get pusherChannel(): string {
    return this.configService.get<string>(
      'PUSHER_CHANNEL',
      'sschat_c2a6e2feefc3c81a79a80b557bddb84f',
    );
  }

  connect(): void {
    if (this._isConnecting || this._isConnected) {
      return;
    }

    this._isConnecting = true;
    this.logger.log('Connecting to Pusher...');

    try {
      // Clean up existing client
      this.cleanup();

      this.client = new Pusher(this.pusherKey, {
        cluster: this.pusherCluster,
      });

      // Connection state handlers
      this.client.connection.bind('connected', () => {
        this._isConnected = true;
        this._isConnecting = false;
        this._lastActivity = new Date();
        this.logger.log('Connected to Pusher');
        this.eventEmitter.emit(PUSHER_STATUS_EVENT, { connected: true });
      });

      this.client.connection.bind('disconnected', () => {
        const wasConnected = this._isConnected;
        this._isConnected = false;
        this._isConnecting = false;
        this.logger.warn('Disconnected from Pusher');
        if (wasConnected) {
          this.eventEmitter.emit(PUSHER_STATUS_EVENT, { connected: false });
        }
        this.scheduleReconnect();
      });

      this.client.connection.bind('error', (err: Error) => {
        const wasConnected = this._isConnected;
        this._isConnected = false;
        this._isConnecting = false;
        this.logger.error('Pusher connection error', err);
        if (wasConnected) {
          this.eventEmitter.emit(PUSHER_STATUS_EVENT, { connected: false });
        }
        this.scheduleReconnect();
      });

      // Subscribe to channel
      this.channel = this.client.subscribe(this.pusherChannel);

      this.channel.bind('pusher:subscription_succeeded', () => {
        this.logger.log(`Subscribed to channel: ${this.pusherChannel}`);
      });

      this.channel.bind('pusher:subscription_error', (error: unknown) => {
        this.logger.error('Channel subscription error', error);
      });

      // Listen for chat messages
      this.channel.bind('chat-message', (data: StreamScannerChatMessage) => {
        this._lastActivity = new Date();
        this._messageCount++;
        this.logger.debug(
          `Received chat message from ${data.chatter_user_name}`,
        );
        this.eventEmitter.emit(CHAT_MESSAGE_EVENT, data);
      });
    } catch (error) {
      this.logger.error('Failed to connect to Pusher', error);
      this._isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private cleanup(): void {
    if (this.channel) {
      this.channel.unbind_all();
      this.channel = null;
    }
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup();
    this._isConnected = false;
    this._isConnecting = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.logger.log('Scheduling reconnection in 5 seconds...');
    this.eventEmitter.emit('pusher.reconnecting', {});

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private startHealthCheck(): void {
    // Check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      // Check Pusher's actual connection state
      const actualState = this.client?.connection?.state;

      // Sync our state with Pusher's actual state
      if (actualState === 'connected' && !this._isConnected) {
        this._isConnected = true;
        this._isConnecting = false;
      } else if (actualState !== 'connected' && actualState !== 'connecting') {
        if (this._isConnected) {
          this.logger.warn(`Pusher state is "${actualState}", reconnecting...`);
          this._isConnected = false;
          this._isConnecting = false;
        }
      }

      // If not connected and not trying to connect, attempt connection
      if (!this._isConnected && !this._isConnecting) {
        this.logger.log('Pusher not connected, attempting reconnection...');
        this.connect();
      }
    }, 30000);
  }

  forceReconnect(): boolean {
    if (this._isConnected || this._isConnecting) {
      return false;
    }
    this.connect();
    return true;
  }

  getStatus() {
    return {
      connected: this._isConnected,
      connecting: this._isConnecting,
      lastActivity: this._lastActivity,
      timeSinceLastActivity: this._lastActivity
        ? Date.now() - this._lastActivity.getTime()
        : null,
      messageCount: this._messageCount,
      channel: this.pusherChannel,
    };
  }
}
