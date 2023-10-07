export type User = {
  userId: string
  email: string
  createdAt: number
  updatedAt: number
}

export type FeedSyncronisation = {
  feedId: string
  url: string

  syncStartedAt: number
  syncCompletedAt: number
  state: 'SYNCED' | 'SYNCING' | 'FAILED'
}

// See https://www.rssboard.org/rss-draft-1#element-channel-item-author

export type Feed = {
  feedId: string
  title: string
  description: string

  url: string

  author?: string
  image?: {
    link: string
    title: string
    url: string
    description?: string
    height?: number // default 31, max 144
    width?: number // default 88, max 400
  }
  category?: string

  lastBuildDate?: number
  pubDate?: number

  skipDays?: string[]
  skipHours?: number[]
  ttl?: number

  updatedAt: number
  createdAt: number
  deleted: boolean
}

export type FeedItem = {
  feedId: string
  pubDate: number
  guid: string
  title: string
  description: string
  author?: string
  category?: string

  link: string
  enclosure?: {
    type: string
    url: string
    length: number
  }

  createdAt: number
  updatedAt: number
  deleted: boolean
}

export type UserSubscription = {
  userId: string
  feedId: string
  url: string
  requestedFrequency: number
  createdAt: number
  updatedAt: number
  deleted: boolean
}

export type UserFeedItemRead = {
  userId: string
  guid: string
  deleted: boolean
  createdAt: number
  updatedAt: number
}

// Sync types

export type ChangeSpecs<T> = {
  created: Array<T>
  updated: Array<T>
  deleted: Array<string>
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
  userFeedItemReads: ChangeSpecs<UserFeedItemRead>
}
