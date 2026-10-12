# QuickCommerce Database Design & Indexes

## 1. Collections & Data Schemas

### `users`
- `_id`: ObjectId
- `name`: String
- `email`: String (Unique lowercase)
- `passwordHash`: String (BCrypt)
- `phone`: String
- `role`: Enum (`CUSTOMER`, `ADMIN`, `DELIVERY_PARTNER`)
- `createdAt`: Date
- **Index**: `{ email: 1 }` (Unique)

### `products`
- `_id`: ObjectId
- `name`: String
- `description`: String
- `categoryId`: ObjectId (Ref: `Category`)
- `image`: String (URL)
- `price`: Number
- `discount`: Number
- `unit`: String
- `active`: Boolean
- **Indexes**:
  - `{ name: "text", description: "text" }` (Full-Text Search)
  - `{ categoryId: 1, active: 1 }` (Category Filter)
  - `{ price: 1 }` (Price Sorting)

### `stores`
- `_id`: ObjectId
- `name`: String
- `address`: String
- `latitude`: Number
- `longitude`: Number
- `location`: GeoJSON Point `{ type: 'Point', coordinates: [lng, lat] }`
- `active`: Boolean
- **Index**: `{ location: "2dsphere" }` (Geospatial Nearby Store Lookups)

### `inventory`
- `_id`: ObjectId
- `storeId`: ObjectId (Ref: `Store`)
- `productId`: ObjectId (Ref: `Product`)
- `availableQuantity`: Number (Min: 0)
- `reservedQuantity`: Number (Min: 0)
- `updatedAt`: Date
- **Compound Unique Index**: `{ storeId: 1, productId: 1 }` (Ensures exactly one inventory row per product per store)

### `carts`
- `_id`: ObjectId
- `userId`: ObjectId (Unique)
- `items`: `[{ productId, storeId, quantity }]`
- `updatedAt`: Date
- **Index**: `{ userId: 1 }` (Unique)

### `orders`
- `_id`: ObjectId
- `userId`: ObjectId
- `storeId`: ObjectId
- `items`: `[{ productId, name, unit, quantity, price, discountPrice }]`
- `subtotal`: Number
- `discount`: Number
- `deliveryFee`: Number
- `tax`: Number
- `total`: Number
- `paymentMethod`: Enum (`COD`, `MOCK_ONLINE`)
- `paymentStatus`: Enum (`PENDING`, `PAID`, `REFUNDED`, `FAILED`)
- `orderStatus`: Enum (`ORDER_PLACED`, `INVENTORY_RESERVED`, `PREPARING_ORDER`, `DELIVERY_PARTNER_ASSIGNED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `FAILED`, `REFUND_PENDING`)
- `idempotencyKey`: String
- `timeline`: `[{ status, timestamp, description }]`
- **Indexes**:
  - `{ userId: 1, idempotencyKey: 1 }` (Compound Unique - Zero Duplicate Orders Guarantee)
  - `{ userId: 1, createdAt: -1 }` (Fast Order History Retrieval)
  - `{ orderStatus: 1, createdAt: -1 }` (Admin / Dispatch Pipeline Filtering)

### `deliveries`
- `_id`: ObjectId
- `orderId`: ObjectId (Unique)
- `partnerId`: ObjectId (Ref: `User`)
- `status`: Enum (`PENDING`, `ASSIGNED`, `ACCEPTED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`)
- `estimatedDeliveryMinutes`: Number
- **Index**: `{ orderId: 1 }` (Unique), `{ partnerId: 1, status: 1 }`

### `order_events`
- `_id`: ObjectId
- `orderId`: ObjectId
- `eventType`: String
- `eventData`: Object
- `service`: String
- `createdAt`: Date
- **Index**: `{ orderId: 1, createdAt: -1 }` (Audit Trail)
