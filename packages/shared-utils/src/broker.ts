import amqp, { Channel, ChannelModel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, EventTopic, TOPIC_EXCHANGE } from '@quickcommerce/event-schemas';
import { Logger } from './logger';

export interface AuditEventRecord {
  id: string;
  eventId: string;
  topic: string;
  sourceService: string;
  payload: unknown;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'RETRY' | 'DEAD_LETTER';
  retryCount: number;
  timestamp: string;
  processedAt?: string;
  error?: string;
}

export interface QueueMetric {
  name: string;
  pendingMessages: number;
  consumerCount: number;
}

export type EventHandler<T = unknown> = (event: DomainEvent & { payload: T }) => Promise<void>;

export class EventBroker {
  private serviceName: string;
  private logger: Logger;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnectedToRabbitMQ = false;

  // In-Memory Fallback & Metrics State
  private memoryQueues = new Map<string, { routingKey: string; handler: EventHandler }[]>();
  private memoryPending = new Map<string, number>();
  private processedEventCount = 0;
  private failedEventCount = 0;
  private retryEventCount = 0;
  private dlqMessages: AuditEventRecord[] = [];
  private eventHistory: AuditEventRecord[] = [];
  private maxHistory = 150;
  private processedEventIds = new Set<string>();

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = new Logger(`${serviceName}:EventBroker`);
    this.initRabbitMQ();
  }

  private async initRabbitMQ(): Promise<void> {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672';
    try {
      const conn = await amqp.connect(url, { timeout: 2500 } as amqp.Options.Connect);
      const ch = await conn.createChannel();

      // Ensure Topic Exchange and DLQ exist
      await ch.assertExchange(TOPIC_EXCHANGE, 'topic', { durable: true });
      await ch.assertExchange('quickcommerce.dlx', 'fanout', { durable: true });
      await ch.assertQueue('quickcommerce.dlq', { durable: true });
      await ch.bindQueue('quickcommerce.dlq', 'quickcommerce.dlx', '');

      this.connection = conn;
      this.channel = ch;
      this.isConnectedToRabbitMQ = true;
      this.logger.info(`Connected to RabbitMQ at ${url}`);

      conn.on('error', (err) => {
        this.logger.warn(`RabbitMQ connection error: ${err.message}. Switched to in-memory fallback.`);
        this.isConnectedToRabbitMQ = false;
      });

      conn.on('close', () => {
        this.logger.warn('RabbitMQ connection closed. Using in-memory fallback broker.');
        this.isConnectedToRabbitMQ = false;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.isConnectedToRabbitMQ = false;
      this.logger.warn(`RabbitMQ unavailable (${msg}). Active with resilient in-memory topic broker.`);
    }
  }

  async publish<T>(topic: EventTopic, payload: T, correlationId?: string): Promise<string> {
    const eventId = uuidv4();
    const event: DomainEvent = {
      eventId,
      topic,
      timestamp: new Date().toISOString(),
      sourceService: this.serviceName,
      correlationId,
      payload,
    } as unknown as DomainEvent;

    const auditRecord: AuditEventRecord = {
      id: uuidv4(),
      eventId,
      topic,
      sourceService: this.serviceName,
      payload,
      status: 'PENDING',
      retryCount: 0,
      timestamp: event.timestamp,
    };
    this.recordAudit(auditRecord);

    if (this.isConnectedToRabbitMQ && this.channel) {
      try {
        const published = this.channel.publish(
          TOPIC_EXCHANGE,
          topic,
          Buffer.from(JSON.stringify(event)),
          {
            persistent: true,
            contentType: 'application/json',
            messageId: eventId,
            correlationId,
          }
        );
        if (published) {
          auditRecord.status = 'PROCESSED';
          auditRecord.processedAt = new Date().toISOString();
          this.processedEventCount++;
          return eventId;
        }
      } catch (err) {
        this.logger.warn(`RabbitMQ publish error: ${(err as Error).message}. Delivering via in-memory broker.`);
      }
    }

    // In-memory dispatch fallback
    this.dispatchMemory(topic, event, auditRecord);
    return eventId;
  }

  private dispatchMemory(topic: string, event: DomainEvent, auditRecord: AuditEventRecord): void {
    const matchingSubscriptions: { queueName: string; handler: EventHandler }[] = [];

    for (const [queueName, subs] of this.memoryQueues.entries()) {
      for (const sub of subs) {
        if (this.matchesRoutingKey(topic, sub.routingKey)) {
          matchingSubscriptions.push({ queueName, handler: sub.handler });
        }
      }
    }

    if (matchingSubscriptions.length === 0) {
      auditRecord.status = 'PROCESSED';
      auditRecord.processedAt = new Date().toISOString();
      this.processedEventCount++;
      return;
    }

    // Deliver to queues asynchronously
    for (const { queueName, handler } of matchingSubscriptions) {
      const currentPending = this.memoryPending.get(queueName) || 0;
      this.memoryPending.set(queueName, currentPending + 1);

      setTimeout(async () => {
        let attempts = 0;
        const maxRetries = 3;
        let success = false;

        while (attempts < maxRetries && !success) {
          try {
            attempts++;
            await handler(event);
            success = true;
          } catch (err) {
            this.retryEventCount++;
            auditRecord.retryCount = attempts;
            this.logger.warn(`Retry ${attempts}/${maxRetries} for event ${event.eventId} on ${queueName}: ${(err as Error).message}`);
          }
        }

        const pendingAfter = (this.memoryPending.get(queueName) || 1) - 1;
        this.memoryPending.set(queueName, Math.max(0, pendingAfter));

        if (success) {
          auditRecord.status = 'PROCESSED';
          auditRecord.processedAt = new Date().toISOString();
          this.processedEventCount++;
        } else {
          auditRecord.status = 'DEAD_LETTER';
          auditRecord.error = 'Max retries exhausted';
          this.failedEventCount++;
          this.dlqMessages.push(auditRecord);
        }
      }, 10);
    }
  }

  private matchesRoutingKey(topic: string, pattern: string): boolean {
    if (pattern === '#' || pattern === topic) return true;
    const topicParts = topic.split('.');
    const patternParts = pattern.split('.');
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] !== '*' && patternParts[i] !== topicParts[i]) return false;
    }
    return topicParts.length === patternParts.length;
  }

  async subscribe<T>(
    queueName: string,
    routingKey: string,
    handler: EventHandler<T>
  ): Promise<void> {
    // Register memory subscription
    const currentSubs = this.memoryQueues.get(queueName) || [];
    currentSubs.push({ routingKey, handler: handler as EventHandler });
    this.memoryQueues.set(queueName, currentSubs);
    if (!this.memoryPending.has(queueName)) {
      this.memoryPending.set(queueName, 0);
    }

    // Register RabbitMQ subscription if connected
    if (this.isConnectedToRabbitMQ && this.channel) {
      try {
        await this.channel.assertQueue(queueName, {
          durable: true,
          deadLetterExchange: 'quickcommerce.dlx',
        });
        await this.channel.bindQueue(queueName, TOPIC_EXCHANGE, routingKey);

        await this.channel.consume(queueName, async (msg) => {
          if (!msg) return;
          const content = msg.content.toString();
          try {
            const event = JSON.parse(content) as DomainEvent;
            
            // Deduplication
            if (this.processedEventIds.has(event.eventId)) {
              this.channel?.ack(msg);
              return;
            }

            await (handler as EventHandler)(event);
            this.processedEventIds.add(event.eventId);
            this.channel?.ack(msg);
            this.processedEventCount++;
          } catch (err) {
            this.logger.error(`Handler error for message in queue ${queueName}: ${(err as Error).message}`);
            // Reject with requeue false to send to DLQ
            this.channel?.nack(msg, false, false);
            this.failedEventCount++;
          }
        });

        this.logger.info(`Subscribed to queue "${queueName}" with routing key "${routingKey}" via RabbitMQ`);
        return;
      } catch (err) {
        this.logger.warn(`RabbitMQ subscription setup error: ${(err as Error).message}`);
      }
    }

    this.logger.info(`Subscribed to queue "${queueName}" with routing key "${routingKey}" via In-Memory Broker`);
  }

  private recordAudit(record: AuditEventRecord): void {
    this.eventHistory.unshift(record);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }
  }

  getMetrics() {
    const queues: QueueMetric[] = [];
    for (const [name, pending] of this.memoryPending.entries()) {
      const consumers = this.memoryQueues.get(name)?.length || 0;
      queues.push({
        name,
        pendingMessages: pending,
        consumerCount: consumers,
      });
    }

    return {
      rabbitMqStatus: this.isConnectedToRabbitMQ ? ('CONNECTED' as const) : ('FALLBACK_EMBEDDED' as const),
      exchangeName: TOPIC_EXCHANGE,
      queues,
      totalProcessedEvents: this.processedEventCount,
      totalFailedEvents: this.failedEventCount,
      totalRetryEvents: this.retryEventCount,
      deadLetterQueueDepth: this.dlqMessages.length,
    };
  }

  getRecentEvents(): AuditEventRecord[] {
    return this.eventHistory;
  }

  getDlqMessages(): AuditEventRecord[] {
    return this.dlqMessages;
  }

  async close(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // ignore
    }
  }
}

// Global Singleton per process
let defaultBroker: EventBroker | null = null;
export const getEventBroker = (serviceName = 'GlobalBroker'): EventBroker => {
  if (!defaultBroker) {
    defaultBroker = new EventBroker(serviceName);
  }
  return defaultBroker;
};
