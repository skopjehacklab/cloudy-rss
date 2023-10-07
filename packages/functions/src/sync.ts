import { ApiHandler, useJsonBody } from 'sst/node/api'
import { pullChanges } from './lib/sync-pull'
import { pushChanges } from './lib/sync-push'
import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda/trigger/api-gateway-proxy'
// import { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

let allowedEmails = process.env.ALLOWED_EMAILS?.split(',') || []

function getAuthorizationContext(e: APIGatewayProxyEventV2WithJWTAuthorizer) {
  let claims = e.requestContext.authorizer.jwt.claims
  let email = e.requestContext.authorizer.jwt.claims['email'] as string
  let googleId = e.requestContext.authorizer.jwt.claims['sub'] as string
  let uid = `google:${googleId}`

  return { uid, email, claims }
}

export const get = ApiHandler(async evt => {
  let auth = getAuthorizationContext(evt as APIGatewayProxyEventV2WithJWTAuthorizer)

  if (!allowedEmails.includes(auth.email)) {
    return {
      statusCode: 403,
      body: `User ${auth.email} is not allowed to access this resource`,
    }
  }

  let lastPulledAt = Number(evt.queryStringParameters?.lastPulledAt)
  let res = await pullChanges(auth.uid, { lastPulledAt, schemaVersion: 1, migration: null })

  console.log(res)

  return {
    statusCode: 200,
    body: JSON.stringify(res),
  }
})

export const post = ApiHandler(async evt => {
  let auth = getAuthorizationContext(evt as APIGatewayProxyEventV2WithJWTAuthorizer)
  if (!allowedEmails.includes(auth.email)) {
    return {
      statusCode: 403,
      body: `User ${auth.email} is not allowed to access this resource`,
    }
  }

  let body = useJsonBody()

  console.log(body)
  await pushChanges(auth.uid, body)

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  }
})
