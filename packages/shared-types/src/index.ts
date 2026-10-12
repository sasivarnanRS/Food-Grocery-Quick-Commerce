// ============================================================================
// CORE ENUMS & CONSTANTS
// ============================================================================

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'DELIVERY_PARTNER';

export type OrderStatus =
  | 'ORDER_PLACED'
  | 'INVENTORY_RESERVED'
  | 'PREPARING_ORDER'
  | 'DELIVERY_PARTNER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUND_PENDING';

export type PaymentMethod = 'COD' | 'MOCK_ONLINE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';

export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

// ============================================================================
// ENTITY INTERFACES
// ============================================================================

export interface IUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
}

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  active: boolean;
  itemCount?: number;
}

export interface IProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  image: string;
  price: number;
  discount: number; // percentage (e.g. 10 for 10% off)
  unit: string;     // e.g. "500g", "1 L", "1 pack"
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IStore {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  active: boolean;
  distanceKm?: number;
}

export interface IInventory {
  id: string;
  storeId: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  updatedAt: string;
  product?: IProduct;
}

export interface ICartItem {
  productId: string;
  product?: IProduct;
  storeId: string;
  quantity: number;
  unitPrice: number;
  discountPrice: number;
}

export interface ICart {
  id: string;
  userId: string;
  items: ICartItem[];
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  tax: number;
  grandTotal: number;
  updatedAt: string;
}

export interface IOrderItem {
  productId: string;
  name: string;
  image: string;
  unit: string;
  quantity: number;
  price: number;
  discountPrice: number;
}

export interface IOrderTimelineItem {
  status: OrderStatus;
  timestamp: string;
  description: string;
}

export interface IOrder {
  id: string;
  userId: string;
  storeId: string;
  storeName?: string;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  idempotencyKey: string;
  deliveryAddress: {
    street: string;
    city: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  timeline: IOrderTimelineItem[];
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  estimatedDeliveryMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IDelivery {
  id: string;
  orderId: string;
  partnerId?: string;
  partnerName?: string;
  partnerPhone?: string;
  status: DeliveryStatus;
  estimatedDeliveryMinutes: number;
  assignedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrderEvent {
  id: string;
  orderId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  service: string;
  createdAt: string;
}

// ============================================================================
// SYSTEM DESIGN & METRICS INTERFACES
// ============================================================================

export interface IServiceHealth {
  service: string;
  port: number;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  uptimeSeconds: number;
  latencyMs: number;
  instanceCount: number;
  recentErrors: number;
  lastHealthCheck: string;
  version: string;
}

export interface IPerformanceMetrics {
  requestRateRps: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  errorRatePercentage: number;
  activeServiceInstances: number;
  cacheHitRatio: number;
  cacheMissRatio: number;
  queueDepth: number;
  successfulOrdersCount: number;
  failedOrdersCount: number;
  reservationFailuresCount: number;
  isSimulated: boolean;
  measurementType: 'LIVE' | 'SIMULATED' | 'HISTORICAL';
}

export interface IDatabaseMonitoring {
  mongoStatus: 'CONNECTED' | 'DISCONNECTED';
  redisStatus: 'CONNECTED' | 'FALLBACK_IN_MEMORY' | 'DISCONNECTED';
  productCount: number;
  storeCount: number;
  inventoryRecordsCount: number;
  ordersCreatedCount: number;
  cacheHits: number;
  cacheMisses: number;
  cacheKeysCount: number;
}

export interface IQueueMonitoring {
  rabbitMqStatus: 'CONNECTED' | 'FALLBACK_EMBEDDED' | 'DISCONNECTED';
  exchangeName: string;
  queues: {
    name: string;
    pendingMessages: number;
    consumerCount: number;
  }[];
  totalProcessedEvents: number;
  totalFailedEvents: number;
  totalRetryEvents: number;
  deadLetterQueueDepth: number;
}

// ============================================================================
// API RESPONSE STANDARDS
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    cached?: boolean;
    servedBy?: string;
    timestamp?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}
