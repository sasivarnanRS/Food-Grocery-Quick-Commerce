import { IOrder, IOrderItem, DeliveryStatus } from '@quickcommerce/shared-types';

export const TOPIC_EXCHANGE = 'quickcommerce.events';

export const EventTopics = {
  ORDER_CREATED: 'order.created',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RESERVATION_FAILED: 'inventory.reservation_failed',
  INVENTORY_UPDATED: 'inventory.updated',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
  DELIVERY_ASSIGNMENT_REQUESTED: 'delivery.assignment_requested',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_STATUS_UPDATED: 'delivery.status_updated',
  NOTIFICATION_REQUESTED: 'notification.requested',
} as const;

export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics];

export interface BaseEvent<T = unknown> {
  eventId: string;
  topic: EventTopic;
  timestamp: string;
  sourceService: string;
  correlationId?: string;
  payload: T;
}

export interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  storeId: string;
  items: IOrderItem[];
  total: number;
}

export interface InventoryReservedPayload {
  orderId: string;
  storeId: string;
  items: { productId: string; quantity: number }[];
  success: boolean;
}

export interface InventoryReservationFailedPayload {
  orderId: string;
  storeId: string;
  reason: string;
  failedItems: { productId: string; requested: number; available: number }[];
}

export interface InventoryUpdatedPayload {
  storeId: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
}

export interface OrderConfirmedPayload {
  order: IOrder;
}

export interface OrderCancelledPayload {
  orderId: string;
  userId: string;
  storeId: string;
  items: IOrderItem[];
  reason: string;
}

export interface DeliveryAssignmentRequestedPayload {
  orderId: string;
  storeId: string;
  deliveryAddress: IOrder['deliveryAddress'];
  itemsCount: number;
}

export interface DeliveryAssignedPayload {
  orderId: string;
  deliveryId: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  estimatedMinutes: number;
}

export interface DeliveryStatusUpdatedPayload {
  orderId: string;
  deliveryId: string;
  previousStatus: DeliveryStatus;
  currentStatus: DeliveryStatus;
  updatedAt: string;
}

export interface NotificationRequestedPayload {
  recipientId: string;
  recipientType: 'USER' | 'ADMIN' | 'DELIVERY_PARTNER';
  channel: 'PUSH' | 'SMS' | 'EMAIL';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export type DomainEvent =
  | (BaseEvent<OrderCreatedPayload> & { topic: typeof EventTopics.ORDER_CREATED })
  | (BaseEvent<InventoryReservedPayload> & { topic: typeof EventTopics.INVENTORY_RESERVED })
  | (BaseEvent<InventoryReservationFailedPayload> & { topic: typeof EventTopics.INVENTORY_RESERVATION_FAILED })
  | (BaseEvent<InventoryUpdatedPayload> & { topic: typeof EventTopics.INVENTORY_UPDATED })
  | (BaseEvent<OrderConfirmedPayload> & { topic: typeof EventTopics.ORDER_CONFIRMED })
  | (BaseEvent<OrderCancelledPayload> & { topic: typeof EventTopics.ORDER_CANCELLED })
  | (BaseEvent<DeliveryAssignmentRequestedPayload> & { topic: typeof EventTopics.DELIVERY_ASSIGNMENT_REQUESTED })
  | (BaseEvent<DeliveryAssignedPayload> & { topic: typeof EventTopics.DELIVERY_ASSIGNED })
  | (BaseEvent<DeliveryStatusUpdatedPayload> & { topic: typeof EventTopics.DELIVERY_STATUS_UPDATED })
  | (BaseEvent<NotificationRequestedPayload> & { topic: typeof EventTopics.NOTIFICATION_REQUESTED });
