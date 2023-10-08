import { StackContext, Api, EventBus, StaticSite, Cron, Table, Function } from 'sst/constructs'

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

  let cronJob = new Function(stack, 'cronjob', {
    handler: 'packages/functions/src/cron.handler',
    environment: {
      TABLE_NAME: feeds.tableName,
    },
  })

  let cron = new Cron(stack, 'cron', {
    job: cronJob,
    schedule: 'rate(2 minutes)',
  })

  cron.attachPermissions([feeds])

  let api = new Api(stack, 'api', {
    authorizers: {
      googleAuth: {
        type: 'jwt',
        jwt: {
          issuer: 'https://accounts.google.com',
          audience: [process.env.GOOGLE_CLIENT_ID],
        },
      },
    },
    defaults: {
      authorizer: 'googleAuth',
      function: {
        timeout: 300,
        environment: {
          TABLE_NAME: feeds.tableName,
          ALLOWED_EMAILS: process.env.ALLOWED_EMAILS || '',
        },
      },
    },
    routes: {
      'GET /sync/pull': 'packages/functions/src/sync.get',
      'POST /sync/push': 'packages/functions/src/sync.post',
    },
  })

  api.attachPermissions([feeds])

  let web = new StaticSite(stack, 'web', {
    path: 'packages/frontend',
    buildOutput: 'build',
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
