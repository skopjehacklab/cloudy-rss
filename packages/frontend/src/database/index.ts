import type * as types from '@cloudy-rss/shared'
import { Dexie } from 'dexie'
import { setContext } from 'svelte'
import { get, type Readable } from 'svelte/store'
import { v4 } from 'uuid'
import { DBSyncronizer } from './sync'

import 'dexie-observable'
import 'dexie-syncable'

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
  feeds!: Dexie.Table<types.Feed, string>
  feedItems!: Dexie.Table<types.FeedItem, string>
  userFeedItemReads!: Dexie.Table<types.UserFeedItemRead, string>
  userSubscriptions!: Dexie.Table<types.UserSubscription, string>
  dbMetadata!: Dexie.Table<DBMetadata, string>

  constructor(private opts: CloudyRSSDatabaseOptions) {
    super('cloudyrss')
    this.version(1).stores({
      feeds: '$$feedId',
      feedItems: '$$guid,feedId',
      userFeedItemReads: '$$guid',
      userSubscriptions: '$$feedId,url',
      dbMetadata: 'key'
    })

    Dexie.Syncable.registerSyncProtocol('watermelon', new DBSyncronizer(this.opts))
    this.syncable.connect('watermelon', this.opts.apiUrl)
  }

  private async getMetadata(key: string) {
    let item = await this.dbMetadata.get(key)
    return item?.value
  }

  private async setMetadata(key: string, value: string) {
    await this.dbMetadata.put({ key, value })
  }

  private syncInterval?: ReturnType<typeof setInterval>

  startAutoSync() {
    this.syncInterval = setInterval(() => {
      let currentToken = get(this.opts.token)
      if (!currentToken) {
        return
      }
      this.dbSync(this.opts.apiUrl, currentToken)
    }, this.opts.autoSyncInterval)
  }
  stopAutoSync() {
    this.syncInterval && clearInterval(this.syncInterval)
  }

  async sync() {
    let currentToken = await waitUntilDefined(this.opts.token)
    await this.dbSync(this.opts.apiUrl, currentToken!)
  }

  private async getUnsentChanges(): Promise<types.ChangesObject> {
    let lastPull = (await this.getMetadata('lastPulledAt')) ?? 0
    let us = this.userSubscriptions.where('updatedAt').above(lastPull).toArray()
    let ufir = this.userFeedItemReads.where('updatedAt').above(lastPull).toArray()
    // For now, we'll send all updates as updates, not as creates or deletes

    let [userSubscriptions, userFeedItemReads] = await Promise.all([us, ufir])
    return {
      userSubscriptions: { updated: userSubscriptions, created: [], deleted: [] },
      userFeedItemReads: { updated: userFeedItemReads, created: [], deleted: [] },
      // we dont have feeds or feeditems to change
      feeds: { updated: [], created: [], deleted: [] },
      feedItems: { updated: [], created: [], deleted: [] }
    }
  }

  private async putReceivedChanges(
    changes: types.ChangesObject,
    lastPulledAt: number
  ): Promise<void> {
    // We receive all changes, including fedeItems and feeds
    // We need to take into account created and deleted too

    let recvTime = Date.now()

    let { userSubscriptions, userFeedItemReads, feedItems, feeds } = changes

    let us = this.userSubscriptions.bulkPut(
      userSubscriptions.updated.concat(userSubscriptions.created)
    )
    let ufir = this.userFeedItemReads.bulkPut(
      userFeedItemReads.updated.concat(userFeedItemReads.created)
    )
    let fi = this.feedItems.bulkPut(feedItems.updated.concat(feedItems.created))
    let f = this.feeds.bulkPut(feeds.updated.concat(feeds.created))

    // execute deletions
    let usd = this.userSubscriptions.bulkDelete(userSubscriptions.deleted.map(x => x.feedId))
    let ufird = this.userFeedItemReads.bulkDelete(userFeedItemReads.deleted.map(x => x.guid))
    let fid = this.feedItems.bulkDelete(feedItems.deleted.map(x => x.guid))
    let fd = this.feeds.bulkDelete(feeds.deleted.map(x => x.feedId))

    await this.setMetadata('lastPulledAt', lastPulledAt.toString())
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

  async addSubscription(url: string, requestedFrequency: number = 300) {
    let currentToken = await waitUntilDefined(this.opts.token)

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
}

const DB_CONTEXT_KEY = 'clodyrss:db'

export function createDBContext(opts: CloudyRSSDatabaseOptions) {
  let db = new CloudyRSSDatabase(opts)
  setContext(DB_CONTEXT_KEY, db)
  db.sync()
  return db
}

export function useDB() {
  let db = getContext<CloudyRSSDatabase>(DB_CONTEXT_KEY)
  return db
}
