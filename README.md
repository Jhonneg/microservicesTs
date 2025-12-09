# Microservices TS Project

This project is a TypeScript-based microservices architecture, featuring services for managing orders and potentially invoices, integrated with a message broker (RabbitMQ) and PostgreSQL databases.

## Services

### 1. Orders Service (`app-orders`)

This service handles order creation and management. It exposes an HTTP API and interacts with a PostgreSQL database and a RabbitMQ message broker.

**Key Features:**

- **HTTP API**: For creating and managing orders.
- **Database**: Uses PostgreSQL with [Drizzle ORM](app-orders/drizzle.config.ts) for data persistence.
- **Message Broker**: Integrates with RabbitMQ via [amqplib](app-orders/src/broker/broker.ts) to publish order-related events.

**Technology Stack:**

- **Runtime**: Node.js
- **Language**: TypeScript
- **Web Framework**: [Fastify](app-orders/src/http/server.ts) with `fastify-type-provider-zod` for schema validation.
- **ORM**: [Drizzle ORM](app-orders/drizzle.config.ts) for PostgreSQL.
- **Message Queuing**: [amqplib](app-orders/src/broker/broker.ts) for RabbitMQ.
- **Schema Validation**: [Zod](app-orders/src/http/server.ts).

**API Endpoints:**

- `GET /health`: Returns "OK" to indicate the service is running.
- `POST /orders`: Creates a new order.
  - **Request Body**:
    ```json
    {
      "amount": 5000
    }
    ```
  - **Example `curl` command**:
    ```sh
    curl -H "Content-Type: application/json" -d '{"amount": 5000 }' http://localhost:3333/orders
    ```

### 2. Invoices Service (`app-invoices`)

_(Details for this service are not provided in the current workspace information, but its directory exists, suggesting future or parallel development.)_

### 3. RabbitMQ Broker

A central message broker service using RabbitMQ for inter-service communication.

## Project Structure

- [`.gitignore`](.gitignore): Global git ignore rules.
- [docker-compose.yml](docker-compose.yml): Root Docker Compose file for the message broker.
- [`app-orders/`](app-orders): Contains the Orders microservice.
  - [`app-orders/Dockerfile`](app-orders/Dockerfile): Dockerfile for the Orders service.
  - [`app-orders/drizzle.config.ts`](app-orders/drizzle.config.ts): Drizzle ORM configuration.
  - [`app-orders/package.json`](app-orders/package.json): Node.js project dependencies and scripts.
  - [`app-orders/tsconfig.json`](app-orders/tsconfig.json): TypeScript configuration.
  - [`app-orders/src/broker/broker.ts`](app-orders/src/broker/broker.ts): RabbitMQ connection setup.
  - [`app-orders/src/broker/channels/orders.ts`](app-orders/src/broker/channels/orders.ts): Orders channel definition for RabbitMQ.
  - [`app-orders/src/db/client.ts`](app-orders/src/db/client.ts): Drizzle database client.
  - [`app-orders/src/db/schema/customers.ts`](app-orders/src/db/schema/customers.ts): Drizzle schema for customers.
  - [`app-orders/src/db/schema/orders.ts`](app-orders/src/db/schema/orders.ts): Drizzle schema for orders.
  - [`app-orders/src/http/server.ts`](app-orders/src/http/server.ts): Fastify HTTP server for the Orders service.
  - [`app-orders/docker-compose.yml`](app-orders/docker-compose.yml): Docker Compose for the Orders service's PostgreSQL database.
  - [`app-orders/docker/create-test-database.sql`](app-orders/docker/create-test-database.sql): SQL script for creating a test database.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (LTS recommended) and npm (for local development)

### Running the Services with Docker Compose

1.  **Start the RabbitMQ Broker:**
    Navigate to the project root and run:

    ```sh
    docker-compose up -d broker
    ```

2.  **Start the Orders Service Database (PostgreSQL):**
    Navigate to the `app-orders` directory and run:

    ```sh
    cd app-orders
    docker-compose up -d pg
    ```

3.  **Build and Run the Orders Service:**
    You can build the Docker image for the `app-orders` service from the `app-orders` directory and then run it.
    _(Note: A full Docker Compose setup would link these, but based on the provided files, these are separate steps.)_

    ```sh
    cd app-orders
    docker build -t app-orders .
    # Example to run the app-orders container, linking to the broker and pg
    # You'll need to ensure network connectivity and environment variables.
    # For a full microservices setup, a single docker-compose.yml at the root is often preferred.
    # For now, if running manually, ensure BROKER_URL and DATABASE_URL are set.
    # Example (simplified):
    docker run -p 3333:3333 -e BROKER_URL="amqp://guest:guest@broker:5672" -e DATABASE_URL="postgresql://docker:docker@pg:5432/orders" app-orders
    ```

    _Ensure `broker` and `pg` are resolvable hostnames in your Docker network setup._

### Running the Orders Service Locally

1.  **Install Dependencies:**

    ```sh
    cd app-orders
    npm install
    ```

2.  **Set Environment Variables:**
    Create an `.env` file in the `app-orders` directory with the following variables. Ensure your RabbitMQ broker and PostgreSQL database are running (as described above or locally).

    ```dotenv
    # filepath: app-orders/.env
    BROKER_URL=amqp://guest:guest@localhost:5672
    DATABASE_URL=postgresql://docker:docker@localhost:5482/orders
    ```

    _Note: `5482` is the mapped port for PostgreSQL in `app-orders/docker-compose.yml`._

3.  **Run Development Server:**
    ```sh
    cd app-orders
    npm run dev
    ```
    The server will start on `http://localhost:3333`.

### Database Migrations (Orders Service)

The project uses [Drizzle Kit](app-orders/drizzle.config.ts) for database migrations.

1.  **Generate a new migration:**

    ```sh
    cd app-orders
    # Ensure DATABASE_URL is set in .env or directly in command
    npx drizzle-kit generate
    ```

2.  **Push changes to the database:**
    ```sh
    cd app-orders
    # Ensure DATABASE_URL is set in .env or directly in command
    npx drizzle-kit push
    ```
