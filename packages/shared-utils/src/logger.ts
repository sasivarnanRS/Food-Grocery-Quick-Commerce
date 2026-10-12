export interface LogMeta {
  service?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaString = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}${metaString}`;
  }

  info(message: string, meta?: LogMeta): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: LogMeta): void {
    console.error(this.formatMessage('error', message, meta));
  }

  debug(message: string, meta?: LogMeta): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const createLogger = (serviceName: string) => new Logger(serviceName);
