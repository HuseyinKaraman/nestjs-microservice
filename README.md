# Sleepr — NestJS Microservices

A hotel reservation platform built with NestJS microservices architecture.

---

## Architecture Overview

The system consists of four independent microservices. Two of them expose HTTP APIs; all internal calls go over **gRPC**. `auth` and `reservations` each own a separate PostgreSQL database, accessed through **Prisma**.

```mermaid
graph TD
    Client["Client (Browser / Postman / HTTP)"]

    subgraph Services["Microservices"]
        R["reservations\nHTTP :3001"]
        A["auth\nHTTP :3000 / gRPC :5001"]
        P["payments\ngRPC :5001"]
        N["notifications\ngRPC :5001"]
    end

    subgraph PG["PostgreSQL :5432"]
        AuthDB[("auth DB\nUser")]
        ResDB[("reservations DB\nReservation")]
    end

    Client -->|"/reservations/*"| R
    Client -->|"/auth/*"| A
    R -->|"gRPC: Authenticate"| A
    R -->|"gRPC: CreateCharge"| P
    P -->|"gRPC: NotifyEmail"| N
    R -->|Prisma| ResDB
    A -->|Prisma| AuthDB
```

---

## Services

| Service | HTTP Port | gRPC | Database | Responsibility |
|---|---|---|---|---|
| **reservations** | 3001 | client only | `reservations` | CRUD for reservations, JWT-protected routes |
| **auth** | 3000 | `auth:5001` | `auth` | User registration, login, JWT signing & validation |
| **payments** | — | `payments:5001` | — | Stripe charge processing |
| **notifications** | — | `notifications:5001` | — | Email notifications via Gmail OAuth |

Each service runs in its own container, so all gRPC servers can use port 5001.

---

## Inter-Service Communication

Services communicate internally via **gRPC** (NestJS `Transport.GRPC`). Contracts live in [`proto/`](proto/):

| Proto file | Service | RPC |
|---|---|---|
| `auth.proto` | `AuthService` | `Authenticate(Authentication) → UserMessage` |
| `payments.proto` | `PaymentsService` | `CreateCharge(CreateChargeMessage) → CreateChargeResponse` |
| `notifications.proto` | `NotificationsService` | `NotifyEmail(NotifyEmailMessage) → Empty` |

TypeScript client/server types are generated with `ts-proto` into `libs/common/src/types`.

```mermaid
sequenceDiagram
    participant C as Client
    participant R as reservations
    participant A as auth (gRPC)
    participant P as payments (gRPC)
    participant N as notifications (gRPC)
    participant DB as PostgreSQL (reservations)

    C->>R: POST /reservations + JWT cookie
    R->>A: Authenticate { Authentication: jwt }
    A-->>R: UserMessage { id, email, roles }
    R->>P: CreateCharge { amount, paymentMethodId, email }
    P->>P: Stripe.paymentIntents.create()
    P-)N: NotifyEmail { email, text }
    N->>N: Send Gmail via OAuth
    P-->>R: { id } (payment intent)
    R->>DB: prisma.reservation.create({ invoiceId: id, userId, ... })
    R-->>C: 201 Created reservation
```

---

## Database (Prisma + PostgreSQL)

Each database-backed service owns its Prisma setup:

```
apps/<service>/
├── prisma/
│   ├── schema.prisma     # models
│   └── migrations/       # SQL migrations (committed)
├── prisma.config.ts      # reads DATABASE_URL
├── generated/prisma/     # generated client (not committed)
└── src/prisma.service.ts # PrismaClient with @prisma/adapter-pg
```

| Service | Model | Fields |
|---|---|---|
| auth | `User` | `id` (Int, autoincrement), `email` (unique), `password`, `roles` (String[]) |
| reservations | `Reservation` | `id` (Int), `timestamp`, `startDate`, `endDate`, `userId` (Int, indexed), `invoiceId` (unique) |

Both databases live on the same PostgreSQL server; the database name is set in each service's `DATABASE_URL`.

### Creating a migration

Migration commands run against your local Postgres using `apps/<service>/.env.local` (`DATABASE_URL=postgresql://...@localhost:5432/<db>`):

```bash
pnpm --filter @sleepr/auth migrate          # prisma migrate dev
pnpm --filter @sleepr/auth generate         # prisma generate
pnpm --filter @sleepr/reservations migrate
pnpm --filter @sleepr/reservations generate
```

Containers apply pending migrations with `prisma migrate deploy` on startup, so you don't need to run migrations manually inside Docker.

---

## Shared Library

`libs/common` is a shared library used by all services. It contains:

| Module / File | Purpose |
|---|---|
| `JwtAuthGuard` | Reusable JWT guard (delegates to auth via gRPC, checks `@Roles()`) |
| `CurrentUser` decorator | Extracts user from request |
| `Roles` decorator | Declares roles required for a route |
| `User` interface | Shared user shape (`id: number`, `email`, `roles`) |
| `types/` | gRPC clients, controllers and messages generated from `proto/` |
| `LoggerModule` | Pino structured logger |
| `HealthModule` | `GET /` health check |
| DTOs: `CardDto`, `CreateChargeDto` | Shared data shapes |

> `libs/common/src/database` still contains the old Mongoose `DatabaseModule` / `AbstractRepository`. No service uses them anymore.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Inter-service | gRPC (`@grpc/grpc-js`, `ts-proto`) |
| Auth | Passport.js, JWT, bcryptjs |
| Payments | Stripe |
| Email | Nodemailer + Google OAuth2 |
| Package Manager | pnpm 10 (workspace) |
| Containerization | Docker (multi-stage builds) |
| Orchestration | Kubernetes + Helm |
| Ingress | NGINX Ingress Controller |

---

## Local Development (Docker Compose)

```bash
docker compose up --build
```

On startup, `auth` and `reservations` run `prisma migrate deploy` and `prisma generate`, then start in watch mode.

Services and ports:

| Service | URL |
|---|---|
| reservations | http://localhost:3001 |
| auth | http://localhost:3000 |
| PostgreSQL | postgresql://postgres:postgres@localhost:5432 |

### How `node_modules` works in dev

The project root is bind-mounted into each container (`.:/usr/src/app`) for hot reload. The `node_modules` folders are masked with anonymous volumes, so containers use the dependencies installed in the image, not the host's:

```yaml
volumes:
  - .:/usr/src/app
  - /usr/src/app/node_modules
  - /usr/src/app/apps/auth/node_modules   # per-app pnpm links
```

Host pnpm links point to host paths (e.g. `C:\Users\...`) and break inside Linux containers. If you see `Cannot find module .../node_modules/prisma/...`, an app-level `node_modules` is not masked.

After changing dependencies, rebuild and recreate the anonymous volumes, otherwise the old `node_modules` is kept:

```bash
docker compose up --build -V
```

---

## Docker Images

Each Dockerfile has two stages:

| Stage | What it does |
|---|---|
| `development` | Installs all dependencies, runs `prisma generate`, builds with `nest build` (webpack). Used by docker-compose. |
| `production` | Installs **prod-only** dependencies (`pnpm install --prod`), copies `dist`, Prisma schema/migrations and `proto/`. Runs `prisma migrate deploy`, then `node dist/apps/<service>/main`. |

```bash
docker build -t auth:latest -f apps/auth/Dockerfile --target production .
docker build -t reservations:latest -f apps/reservations/Dockerfile --target production .
docker build -t payments:latest -f apps/payments/Dockerfile --target production .
docker build -t notifications:latest -f apps/notifications/Dockerfile --target production .
```

> `payments` and `notifications` Dockerfiles still use the old layout (pnpm 8, dev `node_modules` copied into production).

---

## Kubernetes Deployment (Docker Desktop)

> ⚠️ The Helm chart in `k8s/sleepr` has **not been migrated** yet: it still injects `MONGODB_URI` and exposes the old TCP ports (3002–3004). It needs `DATABASE_URL`, the `*_GRPC_URL` variables, port 5001 and a PostgreSQL instance before it works with the current code.

### Prerequisites

```bash
# Install NGINX Ingress Controller (one-time)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
```

### Build images

See [Docker Images](#docker-images).

### Deploy

```bash
cd k8s/sleepr
helm install sleepr .
```

### Access

| Endpoint | URL |
|---|---|
| Reservations API | http://localhost/reservations |
| Auth API | http://localhost/auth |

For full command reference see [docs/KUBERNETES_COMMANDS.md](docs/KUBERNETES_COMMANDS.md).

---

## Project Structure

```
sleepr/
├── apps/
│   ├── auth/             # Auth microservice (+ prisma/)
│   ├── reservations/     # Reservations microservice (+ prisma/)
│   ├── payments/         # Payments microservice
│   └── notifications/    # Notifications microservice
├── libs/
│   └── common/           # Shared guards, decorators, gRPC types
├── proto/                # gRPC contracts
├── k8s/
│   └── sleepr/           # Helm chart
│       └── templates/
│           ├── auth/
│           ├── reservations/
│           ├── payments/
│           ├── notifications/
│           └── ingress.yaml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AUTH_FLOW.md
│   └── KUBERNETES_COMMANDS.md
├── docker-compose.yml
└── pnpm-workspace.yaml
```

---

## Documentation

| File | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Detailed architecture, guards, strategies |
| [docs/AUTH_FLOW.md](docs/AUTH_FLOW.md) | Step-by-step auth flow with diagrams |
| [docs/KUBERNETES_COMMANDS.md](docs/KUBERNETES_COMMANDS.md) | All Docker, Helm, kubectl commands |
