import type * as types from '@cloudy-rss/shared'
import { Dexie } from 'dexie'

import type { Table } from 'dexie-better-types'

import { getContext, setContext } from 'svelte'
import type { Readable } from 'svelte/store'
import { v4 } from 'uuid'
import { DBSyncronizer } from './sync'

import 'dexie-observable'
import 'dexie-syncable'
import { waitUntilDefined } from './util'

export type CloudyRSSDatabaseOptions = {
  autoSyncInterval?: number
  apiUrl: string
  token: Readable<string | undefined>
}

type DBMetadata = {
  key: string
  value: string
}

class CloudyRSSDatabase extends Dexie {
  feeds!: Table<types.Feed, string>
  feedItems!: Table<types.FeedItem, string>
  userFeedItemReads!: Table<types.UserFeedItemRead, string>
  userSubscriptions!: Table<types.UserSubscription, string>
  dbMetadata!: Table<DBMetadata, string>

  constructor(private opts: CloudyRSSDatabaseOptions) {
    super('cloudyrss')
    this.version(1).stores({
      feeds: '$$feedId,updatedAt',
      feedItems: '$$guid,feedId,updatedAt',
      userFeedItemReads: 'guid,feedId,updatedAt',
      userSubscriptions: 'url,feedId,updatedAt'
    })

    Dexie.Syncable.registerSyncProtocol('watermelon', new DBSyncronizer(this.opts))
  }
  private syncInterval?: ReturnType<typeof setInterval>

  startAutoSync() {
    this.syncable.connect('watermelon', this.opts.apiUrl)
  }

  private parseJWT(token: string) {
    let [, payload] = token.split('.')
    let decodedPayload = JSON.parse(atob(payload))
    return decodedPayload
  }

  private getUserId(jwt: string) {
    let payload = this.parseJWT(jwt)
    // TODO: support other providers
    return `google:${payload['sub']}`
  }

  async addSubscription(url: string, requestedFrequency: number = 600) {
    let currentToken = await waitUntilDefined(this.opts.token)

    console.log('Adding user subscription for', url)
    return await this.userSubscriptions.put({
      url,
      feedId: v4(),
      userId: this.getUserId(currentToken!),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false,
      requestedFrequency
    })
  }
  async listSubscriptions() {
    let subs = await this.userSubscriptions.toArray()
    let relatedFeeds = Object.fromEntries(
      (await this.feeds.toArray()).map(feed => [feed.feedId, feed])
    )
    return subs.map(sub => ({ sub, feed: relatedFeeds[sub.feedId] }))
  }
}

const DB_CONTEXT_KEY = 'clodyrss:db'

export function createDBContext(opts: CloudyRSSDatabaseOptions) {
  let db = new CloudyRSSDatabase(opts)
  setContext(DB_CONTEXT_KEY, db)
  db.startAutoSync()
  return db
}

export function useDB() {
  let db = getContext<CloudyRSSDatabase>(DB_CONTEXT_KEY)
  return db
}
