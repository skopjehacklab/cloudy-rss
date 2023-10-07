import { Feed, FeedItem, FeedSyncronisation } from '@cloudy-rss/shared'
import {
  FeedItemTable,
  FeedSyncronisationTable,
  FeedTable,
  UserSubscriptionTable,
} from './lib/model'

import Parser from 'rss-parser'

const MinFeedAge = 5 * 60 * 1000

export async function handler() {
  console.log('Running cron job')

  //
  let feedStartTime = Date.now() - MinFeedAge
  let feedsToSync = await FeedSyncronisationTable.query
    .bySyncCompletedAt({})
    .lt({ syncCompletedAt: feedStartTime })
    .go()

  console.log('Considering these feeds', feedsToSync)

  let syncsToProcess: FeedSyncronisation[] = []

  for (let feedSyncState of feedsToSync.data) {
    let subs = await UserSubscriptionTable.query.byFeedId({ feedId: feedSyncState.feedId }).go()
    let minRequestedFrequency = Math.min(...subs.data.map(s => s.requestedFrequency))
    if (feedSyncState.syncCompletedAt < Date.now() - minRequestedFrequency * 1000) {
      console.log(
        'Syncing feed',
        feedSyncState,
        'because its age is',
        Date.now() - feedSyncState.syncCompletedAt,
        'which is greater than',
        minRequestedFrequency * 1000
      )
      syncsToProcess.push(feedSyncState)
    }
  }
  console.log('Running sync in parallel')
  await Promise.all(syncsToProcess.map(syncFeed))
}

async function syncFeed(feedSync: FeedSyncronisation) {
  let parser = new Parser<
    {
      author: string
      category?: string
      lastBuildDate?: string
      pubDate?: string
      skipDays?: string[]
      skipHours?: number[]
      ttl?: number
    },
    {
      description?: string
      author?: string
      category?: string
    }
  >({
    defaultRSS: 2.0,
    customFields: {
      feed: ['author', 'category', 'lastBuildDate', 'pubDate', 'skipDays', 'skipHours', 'ttl'],
    },
  })

  await FeedSyncronisationTable.update({
    url: feedSync.url,
  })
    .set({
      syncStartedAt: Date.now(),
      state: 'SYNCING',
    })
    .go()

  let feed = await parser.parseURL(feedSync.url)
  let feedObject: Feed = {
    url: feedSync.url,
    title: feed.title!,
    description: feed.description ?? '',
    feedId: feedSync.feedId,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    deleted: false,
    author: feed.author ?? '',
    category: feed.category,
    image: feed.image as any,
    lastBuildDate: feed.lastBuildDate,
    pubDate: feed.pubDate,
    skipDays: feed.skipDays,
    skipHours: feed.skipHours,
    ttl: feed.ttl,
    // link: feed.link,
  }
  await FeedTable.upsert(feedObject).go()

  let feedItems: FeedItem[] = feed.items.map(item => ({
    feedId: feedSync.feedId,
    guid: item.guid ?? item.link!,
    title: item.title ?? '',
    description: item.description ?? '',
    author: item.author ?? '',
    category: item.category,
    link: item.link!,
    enclosure: item.enclosure
      ? {
          url: item.enclosure.url,
          length: item.enclosure.length,
          type: item.enclosure.type,
        }
      : undefined,
    pubDate: item.pubDate!,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deleted: false,
  }))

  // TODO: put does not update items, only inserts
  await FeedItemTable.put(feedItems).go()

  await FeedSyncronisationTable.update({
    url: feedSync.url,
  })
    .set({
      syncCompletedAt: Date.now(),
      state: 'SYNCED',
    })
    .go()
}
