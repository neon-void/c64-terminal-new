import * as net from 'net';

export interface ClientSession {
  socket: net.Socket;
  address: string;
  ip: string;
  openTime: Date;
  buffer: number[];
  timer: NodeJS.Timeout | null;
  lastStatusMessage: Date;
}

export class ClientSessionManager {
  private sessions: Map<string, ClientSession> = new Map();

  add(socket: net.Socket): ClientSession {
    const address = `${socket.remoteAddress}:${socket.remotePort}`;
    const ip = socket.remoteAddress || '';

    const session: ClientSession = {
      socket,
      address,
      ip,
      openTime: new Date(),
      buffer: [],
      timer: null,
      lastStatusMessage: new Date(),
    };

    this.sessions.set(address, session);
    return session;
  }

  get(address: string): ClientSession | undefined {
    return this.sessions.get(address);
  }

  remove(address: string): void {
    const session = this.sessions.get(address);
    if (session?.timer) {
      clearTimeout(session.timer);
    }
    this.sessions.delete(address);
  }

  getAll(): ClientSession[] {
    return Array.from(this.sessions.values());
  }

  count(): number {
    return this.sessions.size;
  }

  addToBuffer(address: string, message: string): void {
    const session = this.sessions.get(address);
    if (!session) return;

    for (let i = 0; i < message.length; i++) {
      session.buffer.push(message.charCodeAt(i));
    }
  }

  broadcastToAll(message: string): void {
    for (const session of this.sessions.values()) {
      for (let i = 0; i < message.length; i++) {
        session.buffer.push(message.charCodeAt(i));
      }
    }
  }

  disconnectAll(): number {
    const count = this.sessions.size;
    for (const session of this.sessions.values()) {
      try {
        if (session.timer) {
          clearTimeout(session.timer);
        }
        session.socket.destroy();
      } catch {
        // Ignore errors during disconnect
      }
    }
    this.sessions.clear();
    return count;
  }

  toJSON(): Array<{ address: string; openTime: Date }> {
    return this.getAll().map((s) => ({
      address: s.address,
      openTime: s.openTime,
    }));
  }
}
