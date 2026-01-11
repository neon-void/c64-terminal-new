import { LoggerService } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { hostname } from 'os';

// Generate instance ID once at module load - short hostname + random suffix
const INSTANCE_ID = `${hostname().slice(0, 8)}-${randomUUID().slice(0, 4)}`;

export function getInstanceId(): string {
  return INSTANCE_ID;
}

interface LokiConfig {
  url: string;
  user: string;
  token: string;
  job: string;
  env: string;
  enabled: boolean;
  authHeader: string;
}

interface LogEntry {
  timestamp: string;
  line: string;
  level: string;
}

let lokiBuffer: LogEntry[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 1000;
const MAX_BUFFER_SIZE = 100;

function getLokiConfig(): LokiConfig {
  const url = process.env.LOKI_URL || '';
  const user = process.env.LOKI_USER || '';
  const token = process.env.LOKI_TOKEN || '';
  const env = process.env.NODE_ENV || 'development';

  return {
    url,
    user,
    token,
    job: process.env.LOKI_JOB || 'c64-terminal-server',
    env,
    enabled: !!url && !!user && !!token && env === 'production',
    authHeader:
      user && token
        ? `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`
        : '',
  };
}

async function flushToLoki(): Promise<void> {
  const config = getLokiConfig();
  if (lokiBuffer.length === 0 || !config.enabled) return;

  const entries = [...lokiBuffer];
  lokiBuffer = [];
  flushTimeout = null;

  // Group by level for separate streams
  const streams: Record<string, { timestamp: string; line: string }[]> = {};
  for (const entry of entries) {
    const level = entry.level.toLowerCase();
    if (!streams[level]) streams[level] = [];
    streams[level].push({ timestamp: entry.timestamp, line: entry.line });
  }

  const payload = {
    streams: Object.entries(streams).map(([level, values]) => ({
      stream: {
        job: config.job,
        env: config.env,
        level,
        service_name: config.job,
        instance_id: INSTANCE_ID,
      },
      values: values.map((v) => [
        (BigInt(new Date(v.timestamp).getTime()) * BigInt(1000000)).toString(),
        v.line,
      ]),
    })),
  };

  try {
    await fetch(`${config.url}/loki/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.authHeader,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently fail - don't want logging failures to break the app
  }
}

function sendToLoki(level: string, message: string, timestamp: string): void {
  const config = getLokiConfig();
  if (!config.enabled) return;

  lokiBuffer.push({ timestamp, line: message, level });

  if (lokiBuffer.length >= MAX_BUFFER_SIZE) {
    void flushToLoki();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(() => void flushToLoki(), FLUSH_INTERVAL_MS);
  }
}

export class LokiLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(message: unknown, context?: string): string {
    const ctx = context || this.context || 'Application';
    const timestamp = new Date().toISOString();

    const logObj: Record<string, unknown> = {
      timestamp,
      instance: INSTANCE_ID,
      context: ctx,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };

    return JSON.stringify(logObj);
  }

  log(message: unknown, context?: string): void {
    const timestamp = new Date().toISOString();
    const formatted = this.formatMessage(message, context);
    console.log(formatted);
    sendToLoki('info', formatted, timestamp);
  }

  error(message: unknown, trace?: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';

    const logObj: Record<string, unknown> = {
      timestamp,
      instance: INSTANCE_ID,
      context: ctx,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };

    if (trace) {
      logObj.trace = trace;
    }

    const formatted = JSON.stringify(logObj);
    console.error(formatted);
    sendToLoki('error', formatted, timestamp);
  }

  warn(message: unknown, context?: string): void {
    const timestamp = new Date().toISOString();
    const formatted = this.formatMessage(message, context);
    console.warn(formatted);
    sendToLoki('warn', formatted, timestamp);
  }

  debug(message: unknown, context?: string): void {
    if (process.env.NODE_ENV === 'production') return;
    const formatted = this.formatMessage(message, context);
    console.debug(formatted);
  }

  verbose(message: unknown, context?: string): void {
    const formatted = this.formatMessage(message, context);
    console.log(formatted);
  }

  fatal(message: unknown, context?: string): void {
    const timestamp = new Date().toISOString();
    const formatted = this.formatMessage(message, context);
    console.error(formatted);
    sendToLoki('fatal', formatted, timestamp);
  }

  setLogLevels(): void {
    // Not implemented - we log all levels
  }
}

// Flush remaining logs on process exit
process.on('beforeExit', () => {
  if (lokiBuffer.length > 0) {
    void flushToLoki();
  }
});
