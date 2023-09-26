import { StackContext, Api, EventBus, StaticSite, Cron, Table, Config } from 'sst/constructs'

export function CloudyRSS({ stack }: StackContext) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Missing GOOGLE_CLIENT_ID')
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_CLIENT_SECRET')
  }

  let feeds = new Table(stack, 'feeds', {
    fields: {
      pk: 'string',
      sk: 'string',
      gsi1pk: 'string',
      gsi1sk: 'string',
    },
    primaryIndex: {
      partitionKey: 'pk',
      sortKey: 'sk',
    },
    globalIndexes: {
      'gsi1pk-gsi1sk-index': {
        partitionKey: 'gsi1pk',
        sortKey: 'gsi1sk',
      },
    },
  })

  let cron = new Cron(stack, 'cron', {
    job: 'packages/functions/src/cron.handler',
    schedule: 'rate(5 minutes)',
  })

  cron.attachPermissions([feeds])

  let api = new Api(stack, 'api', {
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

  api.attachPermissions([feeds])

  let web = new StaticSite(stack, 'web', {
    path: 'packages/frontend',
    buildOutput: 'dist',
    buildCommand: 'npm run build',
    environment: {
      VITE_PUBLIC_API_URL: api.url,
      VITE_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      VITE_GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    },
  })

  stack.addOutputs({
    ApiEndpoint: api.url,
    WebEndpoint: web.url,
  })
}
