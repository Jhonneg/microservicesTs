import { fastify } from "fastify";
import { fastifyCors } from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { channels } from "../broker/channels/index.ts";
import { schema } from "../db/schema/index.ts";
import { db } from "../db/client.ts";

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

    channels.orders.sendToQueue("orders", Buffer.from("Hello World"));

    try {
      await db.insert(schema.orders).values({
        id: randomUUID(),
        customerId: "1651654165",
        amount,
      });
    } catch (error) {
      console.log(error);
    }

    return res.status(201).send();
  }
);

app.listen({ host: "0.0.0.0", port: 3333 }).then(() => {
  console.log("[Orders] HTTP Server running!");
});

// curl -H "Content-Type: application/json" -d '{"amount": 5000 }' http://localhost:3333/orders
