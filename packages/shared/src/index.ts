export type User = {
  userId: string
  email: string
  createdAt: number
  updatedAt: number
}

export type Feed = {
  feedId: string
  url: string
  syncStartedAt: number
  syncCompletedAt: number
  updatedAt: number
  createdAt: number
  image: string
  buildDate: number
  pubDate: number
  state: 'SYNCED' | 'SYNCING'
  deleted: boolean
}

export type FeedItem = {
  feedId: string
  pubDate: number
  guid: string
  title: string
  description: string
  link: string
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
