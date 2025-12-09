import "@opentelemetry/auto-instrumentations-node/register";
import { setTimeout } from "node:timers/promises";
import { trace } from "@opentelemetry/api";
import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { schema } from "../db/schema/index.ts";
import { db } from "../db/client.ts";
import { dispatchOrderCreated } from "../broker/messages/order-created.ts";
import { tracer } from "../tracer/tracer.ts";

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.register(fastifyCors, { origin: "*" });

app.get("/health", () => {
  return "OK";
});

app.post(
  "/orders",
  {
    schema: {
      body: z.object({
        amount: z.number(),
      }),
    },
  },
  async (req, res) => {
    const { amount } = req.body;

    console.log("Creating an order with amount", amount);

    const orderId = randomUUID();

    try {
      await db.insert(schema.orders).values({
        id: randomUUID(),
        customerId: "1651654165",
        amount,
      });
    } catch (error) {
      console.log(error);
    }

    const span = tracer.startSpan("Xabu aq");

    span.setAttribute("testesad", "testando");

    await setTimeout(2000);

    span.end();

    trace.getActiveSpan()?.setAttribute("order_id", orderId);

    dispatchOrderCreated({
      orderId,
      amount,
      customer: {
        id: "1651654165",
      },
    });

    return res.status(201).send();
  }
);

app.listen({ host: "0.0.0.0", port: 3333 }).then(() => {
  console.log("[Orders] HTTP Server running!");
});

// curl -H "Content-Type: application/json" -d '{"amount": 5000 }' http://localhost:3333/orders
