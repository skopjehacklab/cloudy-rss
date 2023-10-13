import { Feed, FeedItem, FeedSyncronisation } from '@cloudy-rss/shared'
import {
  FeedItemTable,
  FeedSyncronisationTable,
  FeedTable,
  UserSubscriptionTable,
} from './lib/model'

import Parser from 'rss-parser'

const MinFeedAge = 5 * 60 * 1000

// Maximum item age relative to previously updatedAt item
const MaxUpsertAge = 5 * 60 * 1000

// Do not retry to sync failed feeds more often than every 15m
const MinSyncAgeFailedFeed = 15 * 60 * 1000

function enhanceError(msg: string) {
  return (e: Error) => {
    throw new Error(`${msg}: ${e}`)
  }
}

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
    let minRequestedFrequency = 1000 * Math.min(...subs.data.map(s => s.requestedFrequency))
    let feedSyncAge = Date.now() - feedSyncState.syncCompletedAt
    if (feedSyncAge > minRequestedFrequency && feedSyncState.state != 'FAILED') {
      console.log(
        'Syncing feed',
        feedSyncState,
        'because its age is',
        Date.now() - feedSyncState.syncCompletedAt,
        'which is greater than',
        minRequestedFrequency * 1000
      )
      syncsToProcess.push(feedSyncState)
    } else if (
      feedSyncAge > MinSyncAgeFailedFeed &&
      feedSyncAge > minRequestedFrequency &&
      feedSyncState.state == 'FAILED'
    ) {
      console.log('Syncing previously failed feed', feedSyncState)
      syncsToProcess.push(feedSyncState)
    }
  }
  console.log('Running sync in batches')
  for (let k = 0; k < syncsToProcess.length; k += 10) {
    console.log('Current batch offset', k)
    await Promise.all(syncsToProcess.slice(k, k + 10).map(syncFeed))
  }
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
      ttl?: string
    },
    {
      description?: string
      author?: string
      category?: string
      'content:encoded'?: string
    }
  >({
    defaultRSS: 2.0,
    customFields: {
      feed: ['author', 'category', 'lastBuildDate', 'pubDate', 'skipDays', 'skipHours', 'ttl'],
      item: ['author', 'category', 'description', 'content:encoded'],
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

  try {
    console.log('Attempting to fetch feed', feedSync.url)
    let req = await fetch(feedSync.url).catch(enhanceError(`Failed to fetch ${feedSync.url}`))
    let text = await req.text().catch(enhanceError(`Failed to read ${feedSync.url}`))
    let feed = await parser
      .parseString(text)
      .catch(enhanceError(`Failed to process ${feedSync.url} status ${req.status} body ${text}`))

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
      ttl: feed.ttl ? Number(feed.ttl) : undefined,
      // link: feed.link,
    }
    await FeedTable.upsert(feedObject).go()

    let lastUpdatedItem = await FeedItemTable.query
      .byFeedIdUpdatedAt({ feedId: feedSync.feedId })
      .go({ limit: 1, order: 'desc' })

    let lastItemTimestamp = lastUpdatedItem.data[0]?.updatedAt ?? 0
    let lastConsideredTimestamp = Math.max(0, lastItemTimestamp - MaxUpsertAge)

    let feedItems: FeedItem[] = feed.items
      .filter(item => !item.pubDate || new Date(item.pubDate).valueOf() > lastConsideredTimestamp)
      .map(item => ({
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
              length: item.enclosure.length ? Number(item.enclosure.length) : undefined,
              type: item.enclosure.type,
            }
          : undefined,
        pubDate: item.pubDate!,
        content: item['content:encoded'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deleted: false,
      }))

    // TODO: put does not update items, only inserts
    console.log('Will update', feedItems.length, 'of', feed.items.length, 'items for', feedSync.url)
    await FeedItemTable.put(feedItems).go()

    await FeedSyncronisationTable.update({
      url: feedSync.url,
    })
      .set({
        syncCompletedAt: Date.now(),
        state: 'SYNCED',
      })
      .go()
  } catch (e) {
    console.error(e)
    // Write that sync failed
    await FeedSyncronisationTable.update({
      url: feedSync.url,
    })
      .set({
        syncCompletedAt: Date.now(),
        state: 'FAILED',
      })
      .go()
  }
}
