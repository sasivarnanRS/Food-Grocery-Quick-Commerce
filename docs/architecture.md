# QuickCommerce Architecture Documentation
**High-Level System Design (Round 3 Challenge)**

## 1. High-Level Architecture Overview

QuickCommerce is designed as a distributed, event-driven microservices platform for sub-15 minute grocery fulfillment. Domain services are decomposed into independent, stateless services with isolated database boundaries, an event messaging backbone, and a multi-tier caching layer.

```
+-------------------------------------------------------------------------+
|                  CUSTOMER APP / ADMIN CONSOLE (React + Vite)            |
+-------------------------------------------------------------------------+
                                     |
                                     | HTTP/REST (JSON)
                                     v
+-------------------------------------------------------------------------+
|                   API GATEWAY (Port 4000)                               |
|   - Round-Robin Load Balancer                                           |
|   - Request ID Correlator (X-Request-Id)                                |
|   - Sliding Window Rate Limiter (300 req/min)                           |
|   - System Design Observability Aggregator                              |
+-------------------------------------------------------------------------+
        |            |             |            |            |
        v            v             v            v            v
  +-----------+ +-----------+ +-----------+ +-----------+ +-----------+
  |   User    | |  Product  | | Inventory | |   Cart    | |   Order   |
  |  Service  | |  Cluster  | |  Service  | |  Service  | |  Service  |
  |  (:4001)  | |  (:4002,  | |  (:4003)  | |  (:4004)  | |  (:4005)  |
  |           | |   :4012,  | |           | |           | |           |
  |           | |   :4022)  | |           | |           | |           |
  +-----------+ +-----------+ +-----------+ +-----------+ +-----------+
        |            |             |                         |
        |            |             |                         |
        v            v             v                         v
+-------------------------------------------------------------------------+
|                        PERSISTENCE & CACHING                            |
|  - MongoDB (27017): Users, Products, Stores, Inventory, Orders          |
|  - Redis Cache (6379): TTL-based cache-aside & invalidation tags        |
+-------------------------------------------------------------------------+
                                     ^
                                     | Event Publishing & Consumption
                                     v
+-------------------------------------------------------------------------+
|             RABBITMQ EVENT STREAM (quickcommerce.events)                |
|  - order.created                                                        |
|  - inventory.reserved / inventory.reservation_failed                    |
|  - order.confirmed                                                      |
|  - delivery.assignment_requested / delivery.assigned                    |
|  - delivery.status_updated                                              |
|  - notification.requested                                               |
|  - Dead-Letter Queue (quickcommerce.dlq) & Bounded Retries              |
+-------------------------------------------------------------------------+
        |                                                    |
        v                                                    v
  +--------------------+                             +--------------------+
  |  Delivery Service  |                             |Notification Service|
  |      (:4006)       |                             |      (:4007)       |
  +--------------------+                             +--------------------+
```

---

## 2. Microservices Responsibilities & Ports

| Service | Port | Description & Responsibilities | Dependencies |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `4000` | Routes client requests, balances load across stateless instances, enforces rate limiting, aggregates health checks. | All services |
| **User Service** | `4001` | Customer, Admin, and Rider registration, BCrypt password hashing, JWT generation, RBAC checks. | MongoDB |
| **Product Service** | `4002`<br>`4012`<br>`4022` | Catalog CRUD, category management, full-text search, Redis cache-aside (TTL 300s). Horizontally scalable. | MongoDB, Redis |
| **Inventory Service** | `4003` | Store inventory, Haversine geospatial nearby store search, single-document conditional atomic reservations ($gte). | MongoDB, Redis, RabbitMQ |
| **Cart Service** | `4004` | Shopping cart persistence, trusted server-side price computation. | MongoDB |
| **Order Service** | `4005` | Idempotent checkout (`{userId, idempotencyKey}` unique index), Saga reservation coordination, order lifecycle. | MongoDB, RabbitMQ, Inventory |
| **Delivery Service** | `4006` | Automated partner assignment, real-time stage progression (ASSIGNED -> PICKED_UP -> OUT -> DELIVERED). | MongoDB, RabbitMQ |
| **Notification Service**| `4007` | Consumes domain events from RabbitMQ and creates in-app notification alerts. | RabbitMQ |

---

## 3. Resilience & Failure Handling
- **Database Fallbacks**: If Redis or RabbitMQ are unreachable in local dev environments, the services degrade gracefully to embedded in-memory TTL maps and embedded topic message brokers without dropping requests.
- **Compensating Transactions**: In multi-item checkouts, if item $K$ fails atomic reservation, items $1..(K-1)$ are immediately compensated via `releaseReservedStock` to prevent leaked inventory.
- **Idempotency**: Clients supply `idempotencyKey`. Network timeouts on client retries return existing order data without multiple deductions.
