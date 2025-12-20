# Microservices TS Project

This project implements a TypeScript-based microservices architecture. It features services for managing orders and processing invoices, interconnected using a RabbitMQ message broker. An API Gateway (Kong) provides a unified entry point, and the entire cloud infrastructure can be deployed to AWS using Pulumi. Distributed tracing is implemented using OpenTelemetry.

## Services Overview

### 1. Orders Service (`app-orders`)

The [app-orders](app-orders) service is responsible for handling order creation and management. It exposes an HTTP API, interacts with a PostgreSQL database, and publishes order-related events to a RabbitMQ message broker.

*   **Functionality**: Creates and manages customer orders.
*   **Technology Stack**:
    *   **Runtime**: Node.js
    *   **Language**: TypeScript
    *   **Web Framework**: [Fastify](app-orders/src/http/server.ts) with `fastify-type-provider-zod` for schema validation.
    *   **ORM**: [Drizzle ORM](app-orders/drizzle.config.ts) for PostgreSQL ([`app-orders/src/db/schema/orders.ts`](app-orders/src/db/schema/orders.ts), [`app-orders/src/db/schema/customers.ts`](app-orders/src/db/schema/customers.ts)).
    *   **Message Queuing**: [amqplib](app-orders/src/broker/broker.ts) for RabbitMQ, publishing [`OrderCreatedMessage`](contracts/messages/order-created-message.ts) to the `orders` queue.
    *   **Schema Validation**: [Zod](app-orders/src/http/server.ts).
    *   **Observability**: OpenTelemetry for distributed tracing ([`app-orders/src/tracer/tracer.ts`](app-orders/src/tracer/tracer.ts)).
*   **API Endpoints**:
    *   `GET /health`: Returns "OK".
    *   `POST /orders`: Creates a new order and dispatches an [`OrderCreatedMessage`](contracts/messages/order-created-message.ts).

### 2. Invoices Service (`app-invoices`)

The [app-invoices](app-invoices) service processes order-related events and is intended for invoice generation and management. It consumes messages from the RabbitMQ broker and persists data to its own PostgreSQL database.

*   **Functionality**: Consumes `order-created` messages from RabbitMQ.
*   **Technology Stack**:
    *   **Runtime**: Node.js
    *   **Language**: TypeScript
    *   **Web Framework**: [Fastify](app-invoices/src/http/server.ts).
    *   **ORM**: [Drizzle ORM](app-invoices/drizzle.config.ts) for PostgreSQL ([`app-invoices/src/db/schema/invoices.ts`](app-invoices/src/db/schema/invoices.ts)).
    *   **Message Queuing**: [amqplib](app-invoices/src/broker/broker.ts), consuming from the `orders` queue ([`app-invoices/src/broker/subscriber.ts`](app-invoices/src/broker/subscriber.ts)).
    *   **Observability**: OpenTelemetry for distributed tracing.
*   **API Endpoints**:
    *   `GET /health`: Returns "OK". (Listens on port 3334 locally, though `Dockerfile` exposes 3333).

### 3. Kong API Gateway (`docker/kong`)

The [Kong API Gateway](docker/kong) acts as the entry point for all external HTTP traffic to the microservices. It handles routing, API management, and can enforce policies like CORS.

*   **Functionality**: Routes requests to the appropriate backend services.
*   **Configuration**: Uses a declarative configuration via [config.template.yaml](docker/kong/config.template.yaml) and `envsubst` for environment variable injection, as managed by [startup.sh](docker/kong/startup.sh).
*   **Routes**: Configured to route requests to the Orders service (e.g., `/orders` routes to `app-orders`).
*   **Pulumi Integration**: Deployed as an ECS Fargate service by [infra/src/services/kong.ts](infra/src/services/kong.ts) using the [kongDockerImage](infra/src/images/kong.ts).

### 4. RabbitMQ Broker

RabbitMQ is used as the central message broker to facilitate asynchronous communication between microservices.

*   **Functionality**: Provides reliable message queuing for events like `OrderCreatedMessage`.
*   **Deployment**: Can be run locally via [docker-compose.yml](docker-compose.yml) or deployed to AWS using [infra/src/services/rabbitmq.ts](infra/src/services/rabbitmq.ts).
*   **Management UI**: Accessible on port `15672` (locally and via Pulumi's `rabbitMQAdminHttpListener`).

### 5. Infrastructure (`infra`)

The [infra](infra) directory contains the Pulumi project for deploying the entire microservices architecture to AWS. It defines ECS clusters, Fargate services, load balancers, ECR repositories, and integrates services like RabbitMQ and Kong.

*   **Technology Stack**: Pulumi with AWSX components ([`infra/package.json`](infra/package.json)).
*   **Components Deployed**:
    *   ECS Fargate Cluster ([`cluster`](infra/src/cluster.ts))
    *   Application Load Balancer ([`appLoadBalancer`](infra/src/load-balancer.ts))
    *   Network Load Balancer ([`networkLoadBalancer`](infra/src/load-balancer.ts))
    *   RabbitMQ Fargate Service ([`rabbitMQService`](infra/src/services/rabbitmq.ts))
    *   Orders Fargate Service ([`ordersService`](infra/src/services/orders.ts))
    *   Kong API Gateway Fargate Service ([`kongService`](infra/src/services/kong.ts))
    *   ECR Repositories for Docker images ([`ordersECRRepository`](infra/src/images/orders.ts), [`kongECRRepository`](infra/src/images/kong.ts))
*   **Outputs**: Exports IDs of deployed services and the RabbitMQ Admin URL ([`infra/index.ts`](infra/index.ts)).

## Shared Components & Concepts

### Message Contracts

Shared message types, such as the [`OrderCreatedMessage`](contracts/messages/order-created-message.ts), are defined in the [contracts/messages](contracts/messages) directory. This ensures consistent data structures for inter-service communication.

### Databases (PostgreSQL with Drizzle ORM)

Both `app-orders` and `app-invoices` use PostgreSQL for data persistence. Each service manages its own database schema and instance. [Drizzle ORM](https://orm.drizzle.team/) is used for type-safe database interactions and migrations.

*   **Orders DB**: Configured in [app-orders/drizzle.config.ts](app-orders/drizzle.config.ts), schema in [app-orders/src/db/schema](app-orders/src/db/schema).
*   **Invoices DB**: Configured in [app-invoices/drizzle.config.ts](app-invoices/drizzle.config.ts), schema in [app-invoices/src/db/schema](app-invoices/src/db/schema).

### OpenTelemetry Tracing

Distributed tracing is implemented across the `app-orders` and `app-invoices` services using OpenTelemetry. This allows for end-to-end visibility of requests as they flow through the microservices.

*   **Configuration**: Environment variables like `OTEL_TRACES_EXPORTER`, `OTEL_EXPORTER_OTLP_ENDPOINT`, and `OTEL_SERVICE_NAME` are used (e.g., in [`infra/src/services/orders.ts`](infra/src/services/orders.ts)).
*   **Instrumentation**: `fastify`, `pg`, `amqplib` are automatically instrumented using `@opentelemetry/auto-instrumentations-node`.
*   **Jaeger**: A Jaeger all-in-one instance is available in the root [docker-compose.yml](docker-compose.yml) for local tracing visualization.

## Getting Started (Local Development)

This section details how to get the entire microservices stack running locally using Docker Compose and Node.js.

### Prerequisites

*   [Docker](https://www.docker.com/get-started/) and Docker Compose
*   [Node.js](https://nodejs.org/) (LTS recommended) and npm

### Running Services with Docker Compose (Local Stack)

To run the message broker, API Gateway, PostgreSQL databases, and a Jaeger tracing instance, execute the following commands from the project root:

1.  **Start Core Infrastructure (RabbitMQ, Kong, Jaeger):**
    ```sh
    docker-compose up -d broker api-gateway jaeger
    ```
2.  **Start Orders Service Database:**
    ```sh
    cd app-orders
    docker-compose up -d pg
    cd ..
    ```
3.  **Start Invoices Service Database:**
    ```sh
    cd app-invoices
    docker-compose up -d invoices-pg
    cd ..
    ```

### Running Individual Services Locally (Node.js)

After the Docker Compose services are up, you can run the `app-orders` and `app-invoices` Node.js applications locally.

1.  **Orders Service:**
    a.  **Install Dependencies:**
        ```sh
        cd app-orders
        npm install
        ```
    b.  **Create `.env` file:**
        Create an `.env` file in the `app-orders` directory:
        ```dotenv
        # filepath: app-orders/.env
        BROKER_URL=amqp://guest:guest@localhost:5672
        DATABASE_URL=postgresql://docker:docker@localhost:5482/orders
        OTEL_TRACES_EXPORTER=otlp
        OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
        OTEL_EXPORTER_OTLP_HEADERS=
        OTEL_SERVICE_NAME=orders
        OTEL_RESOURCE_ATTRIBUTES=service.name=orders,service.namespace=event-nodejs
        OTEL_NODE_RESOURCE_DETECTORS=env,host,os
        OTEL_NODE_INSTRUMENTATIONS=http,fastify,pg,amqplib
        ```
    c.  **Run Development Server:**
        ```sh
        npm run dev
        ```
        The Orders service will be available at `http://localhost:3333`.

2.  **Invoices Service:**
    a.  **Install Dependencies:**
        ```sh
        cd app-invoices
        npm install
        ```
    b.  **Create `.env` file:**
        Create an `.env` file in the `app-invoices` directory:
        ```dotenv
        # filepath: app-invoices/.env
        BROKER_URL=amqp://guest:guest@localhost:5672
        DATABASE_URL=postgresql://docker:docker@localhost:5483/invoices
        OTEL_TRACES_EXPORTER=otlp
        OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
        OTEL_EXPORTER_OTLP_HEADERS=
        OTEL_SERVICE_NAME=invoices
        OTEL_RESOURCE_ATTRIBUTES=service.name=invoices,service.namespace=event-nodejs
        OTEL_NODE_RESOURCE_DETECTORS=env,host,os
        OTEL_NODE_INSTRUMENTATIONS=http,fastify,pg,amqplib
        ```
    c.  **Run Development Server:**
        ```sh
        npm run dev
        ```
        The Invoices service will be available at `http://localhost:3334`.

### API Endpoints (Local)

Once all services are running, you can interact with them via the Kong API Gateway or directly.

*   **Orders Service (via Kong):**
    ```sh
    curl -H "Content-Type: application/json" -d '{"amount": 5000 }' http://localhost:8000/orders
    ```
*   **Orders Service (Direct):**
    ```sh
    curl -H "Content-Type: application/json" -d '{"amount": 5000 }' http://localhost:3333/orders
    ```
*   **RabbitMQ Management UI:** `http://localhost:15672`
*   **Kong Admin UI:** `http://localhost:8002`
*   **Jaeger UI:** `http://localhost:16686`

## Infrastructure Deployment (AWS with Pulumi)

The `infra` project allows you to deploy this microservices architecture to AWS using Pulumi.

### Prerequisites

*   [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) (>= v3)
*   [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials.
*   Node.js (LTS recommended)

### Deployment Steps

1.  **Navigate to the `infra` directory:**
    ```sh
    cd infra
    ```
2.  **Install Dependencies:**
    ```sh
    npm install
    ```
3.  **Set AWS Region and Environment Variables:**
    Ensure your `Pulumi.dev.yaml` ([`infra/Pulumi.dev.yaml`](infra/Pulumi.dev.yaml)) is configured with the desired AWS region.
    Also, create an `.env` file for database URLs and Grafana API keys, similar to the provided [`infra/.env`](infra/.env) example:
    ```dotenv
    # filepath: infra/.env
    DB_ORDER='postgresql://<user>:<password>@<host>/<db>?sslmode=require&channel_binding=require'
    DB_INVOICES='postgresql://<user>:<password>@<host>/<db>?sslmode=require&channel_binding=require'
    node-orders='<Grafana_API_Key>' # Example from infra/.env
    GRAFANA_SK='<Grafana_Authorization_Header_Value>' # Example from infra/.env
    ```
4.  **Preview and Deploy:**
    ```sh
    pulumi up
    ```
    This command will show you a preview of the resources Pulumi will create. Confirm to proceed with the deployment.
5.  **Tear Down (when finished):**
    ```sh
    pulumi destroy
    pulumi stack rm
    ```

### Exported Outputs

The `infra` project exports useful information after deployment:

*   [`kongId`](infra/index.ts): ID of the Kong API Gateway service.
*   [`ordersId`](infra/index.ts): ID of the Orders service.
*   [`rabbitMQId`](infra/index.ts): ID of the RabbitMQ service.
*   [`rabbitMQAdminUrl`](infra/index.ts): URL to access the RabbitMQ Management UI.

## Database Migrations

Both `app-orders` and `app-invoices` use [Drizzle Kit](https://orm.drizzle.team/kit) for managing database schema migrations.

1.  **Navigate to the specific service directory** (e.g., `app-orders` or `app-invoices`).
2.  **Ensure `DATABASE_URL` is set** in your `.env` file or directly as an environment variable.
3.  **Generate a new migration:**
    ```sh
    npx drizzle-kit generate
    ```
4.  **Apply changes to the database:**
    ```sh
    npx drizzle-kit push
    ```
