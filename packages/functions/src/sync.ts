import { ApiHandler } from 'sst/node/api'
import { pullChanges } from './lib/sync-pull'

export const get = ApiHandler(async evt => {
  let lastPulledAt = Number(evt.queryStringParameters?.lastPulledAt)
  // let res = pullChanges('x', { lastPulledAt, schemaVersion: 1, migration: null })
  return {
    statusCode: 200,
    body: `Hello world. The time is ${new Date().toISOString()}`,
  }
})

export const post = ApiHandler(async _evt => {
  return {
    statusCode: 200,
    body: `Hello world. The time is ${new Date().toISOString()}`,
  }
})
