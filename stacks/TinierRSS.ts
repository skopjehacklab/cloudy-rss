import { StackContext, Api, EventBus, StaticSite, Cron } from 'sst/constructs'

export function TinierRSS({ stack }: StackContext) {
  new Cron(stack, 'cron', {
    job: 'packages/functions/src/cron.handler',
    schedule: 'rate(5 minutes)',
  })
  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        timeout: 300,
      },
    },
    routes: {
      'GET /sync': 'packages/functions/src/sync.get',
      'POST /sync': 'packages/functions/src/sync.post',
    },
  })

  const web = new StaticSite(stack, 'web', {
    path: 'packages/frontend',
    buildOutput: 'dist',
    buildCommand: 'npm run build',
    environment: {
      VITE_PUBLIC_API_URL: api.url,
    },
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
    WebEndpoint: web.url,
  })
}
