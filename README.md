# QuickCommerce Platform
**Production-Grade Food & Grocery Quick-Commerce Platform & High-Level System Design**
*Round 3 — High-Level System Design Challenge (25 Marks)*

QuickCommerce is an end-to-end, full-stack grocery quick-commerce platform inspired by **Blinkit** and **Zepto**. It combines a rich customer shopping application (10-minute delivery, cart management, checkout, real-time rider tracking) with a live engineering operations console (`/admin/system-design`) demonstrating microservices architecture, Redis caching, RabbitMQ event streaming, atomic concurrency control, and horizontal load balancing.

---

## 🚀 Key Features & Highlights

### 1. Customer Shopping Application
- **10 Grocery Categories**: Fruits, Vegetables, Dairy, Bakery, Snacks, Beverages, Rice and Grains, Personal Care, Household Essentials, Frozen Foods.
- **Debounced Search**: Case-insensitive instant search with auto-complete suggestions.
- **Geospatial Store Availability**: Nearby dark store selection with dynamic delivery ETA (~10-15 mins).
- **Persistent Cart**: Server-side trusted pricing recalculations (never trusts frontend prices).
- **Idempotent Checkout**: `POST /api/v1/orders` requiring unique client idempotency key to prevent double-charging or duplicate reservations.
- **Real-Time 7-Stage Order Tracking**: 
  1. Order Placed ➔ 2. Inventory Reserved ➔ 3. Preparing Order ➔ 4. Rider Assigned ➔ 5. Picked Up ➔ 6. Out for Delivery ➔ 7. Delivered.

### 2. High-Level System Design Console (`/admin/system-design`)
- **Interactive Architecture Topology**: Visual node diagram of all 7 microservices, dependencies, and routing.
- **Live Microservices Health Aggregation**: Response latencies, uptimes, and instance counts gathered live from `/health` endpoints.
- **Live Telemetry vs Simulated Metrics**: Transparent labeling of live measured RPS, P95 latency, and order counters.
- **RabbitMQ Queue Depth & DLQ**: Real-time queue metrics and Dead-Letter Queue inspection.
- **Scalability Lab**: In-browser load-test runner executing live HTTP benchmarks against Product Service instances, showing latency percentiles (P50, P90, P95, P99) and Cache ON vs OFF comparisons.

### 3. Distributed Systems Engineering
- **Atomic Concurrency Control**: Uses single-document conditional updates (`availableQuantity >= requestedQuantity`) in MongoDB to guarantee that two simultaneous customers can never buy the same final unit of milk.
- **Saga Compensations**: Multi-item failures trigger automatic rollback releases (`releaseReservedStock`).
- **Horizontal Scaling & Load Balancing**: Stateless Product Service instances run on ports `4002`, `4012`, `4022` with round-robin load balancing and `X-Served-By` response verification.
- **Multi-Tier Caching**: Redis Cache-Aside pattern for products (TTL 300s), categories (TTL 900s), search queries (TTL 60s), nearby store results (TTL 5s), and cache invalidation tags.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, React Router 7, Axios, Recharts, Lucide React |
| **Backend Services**| Node.js 22, Express.js, TypeScript, REST APIs, JWT, Zod Validation, BCrypt |
| **Database** | MongoDB 7.0, Mongoose (Geospatial 2dsphere indexes, Text search, Compound unique indexes) |
| **Caching** | Redis (with resilient in-memory TTL engine fallback) |
| **Messaging** | RabbitMQ (Topic Exchange `quickcommerce.events` with DLQ and resilient in-memory broker fallback) |
| **Infrastructure** | Docker, Docker Compose, Nginx Load Balancer |
| **Testing** | Vitest, Node Test Runner |

---

## 📁 Monorepo Structure

```text
c:/project/sd-sat/
├── package.json                      # Monorepo root scripts & workspace definitions
├── tsconfig.base.json                # Shared TypeScript compiler options
├── .env                              # Environment configuration (pre-configured)
├── .env.example                      # Template environment variables
├── docker-compose.yml                # Microservices, MongoDB, Redis, RabbitMQ & Nginx setup
├── packages/
│   ├── shared-types/                 # Domain interfaces, DTOs, API response envelopes
│   ├── event-schemas/                # RabbitMQ event contracts, payloads & topics
│   ├── shared-utils/                 # Logger, Errors, Auth, CacheService, EventBroker, Zod helpers
│   └── database/                     # Mongoose schemas & atomic reservation static methods
├── services/
│   ├── api-gateway/                  # Port 4000: Gateway, Load Balancer, Rate Limiter, Observability
│   ├── user-service/                 # Port 4001: Auth, BCrypt, JWT, RBAC
│   ├── product-service/              # Port 4002/4012/4022: Catalog, Search, Redis Cache-Aside
│   ├── inventory-service/            # Port 4003: Store Inventory, Nearby Haversine Lookup, Atomic Reservation
│   ├── cart-service/                 # Port 4004: Cart Persistence & Server-Side Totals Calculation
│   ├── order-service/                # Port 4005: Idempotent Orders, Saga Compensation, Lifecycle
│   ├── delivery-service/             # Port 4006: Partner Fleet Dispatch & Tracking Stages
│   └── notification-service/         # Port 4007: RabbitMQ Event Consumer & In-App Alerts
├── apps/
│   └── web/                          # Customer App, Rider Portal, Admin Portal & System Design Console
├── infrastructure/
│   ├── dev-runner.ts                 # Multi-process orchestrator for local development
│   ├── seed/seed.ts                  # Database seeder (32 products, 10 categories, 3 stores, 5 demo users)
│   └── nginx/nginx.conf              # Load balancer configuration for horizontal scaling
├── tests/
│   └── integration/                  # 18 scenario automated end-to-end and concurrency test suites
└── docs/
    ├── architecture.md               # High-level architecture and component interactions
    ├── api.md                        # Complete REST API reference
    ├── database-design.md            # Collection schemas, indexes, and rationale
    ├── event-flow.md                 # RabbitMQ event schemas and saga sequence diagrams
    └── scalability.md                # Benchmarks, caching impact, and Kubernetes autoscaling guide
```

---

## 🏁 Quickstart & Execution Instructions

### 1. Prerequisites
- **Node.js**: v18+ (verified on v22.15.1)
- **MongoDB**: Running locally on `mongodb://127.0.0.1:27017` (or via Docker)

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Demonstration Database
Populates 32 grocery products, 10 categories, 3 dark stores, 5 demo accounts, realistic stock, and historical orders:
```bash
npm run seed
```

### 4. Start the Application

#### Option A: Start All Microservices & Web App (Recommended for Local Dev)
In Terminal 1 (starts all 8 microservices + scaled instances concurrently):
```bash
npm run dev
```

In Terminal 2 (starts the React Vite frontend):
```bash
npm run dev:web
```
Now open **http://localhost:5173** in your browser.

#### Option B: Start via Docker Compose (Multi-Container Deployment)
```bash
docker compose up --build
```

---

## 🔑 Pre-Configured Demonstration Accounts

| Role | Email | Password | Primary Portal |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@quickcommerce.com` | `Admin@123` | `/admin` & `/admin/system-design` |
| **Customer** | `customer@quickcommerce.com` | `Customer@123` | `/` (Home shopping app) |
| **Rider** | `partner@quickcommerce.com` | `Partner@123` | `/delivery/dashboard` |

*(Note: The login dialog includes 1-click quick login buttons for instant role switching without typing credentials!)*

---

## 🧪 Running Automated Tests

Run the critical concurrency test proving two customers cannot reserve the same final unit:
```bash
npm run test:concurrency
```

Run all 18 end-to-end integration scenarios:
```bash
npm run test:all
```

---

## ✅ Verified Functionality Checklist (20/20)

- [x] **1. User Registration and Login**: BCrypt password hashing, JWT bearer tokens, role enforcement.
- [x] **2. Product Search**: Debounced, case-insensitive, category-filtered full text search.
- [x] **3. 10 Grocery Categories**: Fruits, Veggies, Dairy, Bakery, Snacks, Beverages, Grains, Personal Care, Household, Frozen.
- [x] **4. Nearby Dark Stores**: Geospatial Haversine calculation with live ETA and distance metrics.
- [x] **5. Shopping Cart**: Add, remove, update quantities with server-side pricing verification.
- [x] **6. Idempotent Checkout**: Unique constraint `{userId, idempotencyKey}` preventing duplicate orders.
- [x] **7. Atomic Inventory Reservation**: Conditional MongoDB update (`availableQuantity >= requestedQuantity`) preventing race conditions.
- [x] **8. Concurrency Test Verified**: Automated test confirms two simultaneous shoppers cannot buy the same final unit.
- [x] **9. Saga Rollback Compensation**: Multi-item failure safely releases locked items back to store stock.
- [x] **10. Real-Time 7-Stage Order Tracking**: Live stepper from Order Placed to Delivered.
- [x] **11. Rider Fleet Portal**: Delivery partners accept orders and advance stages (`ACCEPTED` ➔ `PICKED_UP` ➔ `OUT` ➔ `DELIVERED`).
- [x] **12. Order Cancellation**: Restores reserved stock back to store inventory.
- [x] **13. Redis Caching**: Cache-Aside pattern for products (TTL 300s), categories (TTL 900s), search (TTL 60s), and nearby stores (TTL 5s).
- [x] **14. Cache Invalidation**: Automatic eviction on product and inventory mutations.
- [x] **15. RabbitMQ Event Streaming**: Topic exchange `quickcommerce.events` with bounded retries and Dead-Letter Queue (`quickcommerce.dlq`).
- [x] **16. System Design Dashboard (`/admin/system-design`)**: Professional operations console with interactive topology.
- [x] **17. Live Health Aggregator**: Real-time health metrics from all 7 microservices.
- [x] **18. Scalability Lab**: Interactive benchmark runner showing RPS and P50/P90/P95/P99 latency distribution curves.
- [x] **19. Horizontal Scaling**: Round-robin load balancer distributing traffic across Product Service instances on ports 4002, 4012, 4022 with `X-Served-By` verification.
- [x] **20. Production-Ready Documentation**: Complete OpenAPI reference, database schemas, event flow sequence diagrams, and scalability benchmarks.
#   F o o d - G r o c e r y - Q u i c k - C o m m e r c e  
 