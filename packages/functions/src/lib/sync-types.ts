// See https://watermelondb.dev/docs/Sync/Backend

import { Feed, FeedItem, UserFeedItemRead, UserSubscription } from '@cloudy-rss/shared'

export type ChangeSpecs<T> = {
  created: Array<T>
  updated: Array<T>
  deleted: Array<T>
}

export type Timestamp = number

export interface PullParameters {
  lastPulledAt: Timestamp
  schemaVersion: number
  migration: null | PullMigration
}

export type PullMigration = {
  from: number
  tables: string[]
  columns: { table: string; columns: string[] }[]
}

export type ChangesObject = {
  feeds: ChangeSpecs<Feed>
  feedItems: ChangeSpecs<FeedItem>
  userSubscriptions: ChangeSpecs<UserSubscription>
  feedItemReads: ChangeSpecs<UserFeedItemRead>
}
