import amqp from "amqplib";

if (!process.env.BROKER_URL) throw new Error("No Broker URL");

export const broker = await amqp.connect(process.env.BROKER_URL);
