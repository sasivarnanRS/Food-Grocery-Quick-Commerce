# QuickCommerce REST API Documentation

Base URL: `http://localhost:4000/api/v1`

All responses follow the standard JSON schema:
```json
{
  "success": true,
  "message": "Human-readable summary",
  "data": {},
  "meta": { "cached": true, "servedBy": "ProductService-4002" }
}
```

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
Creates a customer or delivery partner account.
- **Request Body**:
  ```json
  {
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "password": "Password@123",
    "role": "CUSTOMER"
  }
  ```
- **Response**: `201 Created` with JWT Bearer Token.

### `POST /auth/login`
Authenticates user and returns token.
- **Request Body**: `{ "email": "...", "password": "..." }`
- **Response**: `200 OK` with token and user profile.

### `GET /auth/me`
Retrieves authenticated user profile.
- **Header**: `Authorization: Bearer <token>`
- **Response**: `200 OK`.

---

## 2. Products & Catalog (`/products`, `/categories`)

### `GET /products`
Searches products with category filtering and pagination.
- **Query Params**:
  - `search` (string, case-insensitive)
  - `category` (string, slug or category ID)
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
- **Response Headers**: `X-Served-By: ProductService-<PORT>`

### `GET /products/:id`
Retrieves product details (Cached in Redis for 300s).

### `POST /products` (Admin Only)
Adds a new product and invalidates search caches.

### `GET /categories`
Returns 10 grocery categories (Cached for 900s).

---

## 3. Stores & Inventory (`/stores`, `/inventory`)

### `GET /stores`
Returns list of all active fulfillment dark stores.

### `GET /inventory/nearby`
Returns stores sorted by distance using the Haversine formula.
- **Query Params**: `lat=12.9716&lon=77.6412&radius=15`
- **Cache TTL**: 5 seconds.

### `GET /inventory/store/:storeId`
Returns real-time stock levels for all products at a specific store.

### `POST /inventory/reservations`
Atomic conditional inventory reservation.
- **Request Body**:
  ```json
  {
    "storeId": "651a...",
    "orderId": "651b...",
    "items": [{ "productId": "651c...", "quantity": 2 }]
  }
  ```

---

## 4. Shopping Cart (`/cart`)

### `GET /cart`
Returns active cart with server-side recalculated subtotal, discount, delivery fee, and taxes.

### `POST /cart/items`
Adds item to cart. Never trusts prices provided by client.
- **Request Body**: `{ "productId": "...", "quantity": 1, "storeId": "..." }`

### `PATCH /cart/items/:itemId`
Updates quantity or removes item when quantity is 0.

---

## 5. Orders (`/orders`)

### `POST /orders`
Idempotent order checkout with atomic stock reservation.
- **Request Body**:
  ```json
  {
    "idempotencyKey": "unique-client-uuid",
    "storeId": "651a...",
    "paymentMethod": "COD",
    "deliveryAddress": {
      "street": "100 Feet Rd",
      "city": "Bengaluru",
      "pincode": "560038"
    }
  }
  ```
- **Idempotency Guarantee**: Submitting same key returns original order without double deduction.

### `GET /orders`
Returns user order history or all orders for Admin.

### `POST /orders/:orderId/cancel`
Cancels order and invokes compensating stock release.

---

## 6. Delivery Dispatch (`/delivery`)

### `GET /orders/:orderId/delivery-status`
Returns real-time tracking, rider coordinates, and stage.

### `PATCH /delivery/assignments/:id/status`
Advances delivery stage (`ACCEPTED` -> `PICKED_UP` -> `OUT_FOR_DELIVERY` -> `DELIVERED`).

---

## 7. System Design & Admin Observability (`/admin`)

- `GET /admin/services/health`: Live health status from all 7 microservices.
- `GET /admin/metrics`: Live throughput, P95 latency, order success counters.
- `GET /admin/system-design/queues`: RabbitMQ queue depths and DLQ count.
- `GET /admin/system-design/events`: Live event audit stream.
- `POST /admin/system-design/load-test`: Scalability Lab benchmark execution.
