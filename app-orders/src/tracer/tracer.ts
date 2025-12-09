import { trace } from "@opentelemetry/api";

if (!process.env.OTEL_SERVICE_NAME)
  throw new Error("No OTEL SERVICE NAME configured");

export const tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME);
