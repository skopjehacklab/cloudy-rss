export type User = {
  userId: string
  email: string
  createdAt: number
  updatedAt: number
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

  syncStartedAt?: number
  syncCompletedAt?: number
  state: 'SYNCED' | 'SYNCING'

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
  feedId: string
  userId: string
  requestedFrequency: number
  createdAt: number
  updatedAt: number
  deleted: boolean
}

export type UserFeedItemRead = {
  userId: string
  feedItemId: string
  deleted: boolean
  createdAt: number
  updatedAt: number
}
