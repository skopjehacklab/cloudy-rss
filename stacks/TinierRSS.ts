import { StackContext, Api, EventBus, StaticSite } from "sst/constructs";

export function TinierRSS({ stack }: StackContext) {


  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 10,
    },
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bus],
      },
    },
    routes: {
      "GET /sync": "packages/functions/src/sync.get",
      "POST /sync": "packages/functions/src/sync.post"
    },
  });

  const web = new StaticSite(stack, "web", {
    path: "packages/frontend",
    buildOutput: "dist",
    buildCommand: "npm run build",
    environment: {
      VITE_PUBLIC_API_URL: api.url,
    },
  });


  stack.addOutputs({
    ApiEndpoint: api.url,
    WebEndpoint: web.url,
  });
}
