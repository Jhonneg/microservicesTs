import * as awsx from "@pulumi/awsx";
import { cluster } from "../cluster";
import { kongDockerImage } from "../images/kong";
import * as pulumi from "@pulumi/pulumi";
import { ordersHttpListener } from "./orders";

export const kongMQService = new awsx.classic.ecs.FargateService(
  "fargate-kong",
  {
    cluster,
    desiredCount: 1,
    waitForSteadyState: false,
    taskDefinitionArgs: {
      container: {
        image: kongDockerImage.ref,
        cpu: 256,
        memory: 512,
        portMappings: [],
        environment: [
          {
            name: "KONG_DATABASE",
            value: "off",
          },
          { name: "KONG_ADMIN_LISTEN", value: "0.0.0.0:8001" },
          {
            name: "ORDER_SERVICE_URL",
            value: pulumi.interpolate`http://${ordersHttpListener.endpoint.hostname}:${ordersHttpListener.endpoint.port}`,
          },
        ],
      },
    },
  }
);
