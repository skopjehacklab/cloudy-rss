import { FeedSyncronisation, Feed, FeedItem } from '@cloudy-rss/shared'
import Parser from 'rss-parser'
import { FeedSyncronisationTable, FeedTable, FeedItemTable } from './model'
import { enhanceError } from './errors'

/**
 * Sync a single feed
 * @param feedSync the feed to sync
 * @param MaxUpsertAge the maximum age of an item relative to the last updated item to consider it for upsert
 */
export async function syncFeed(feedSync: FeedSyncronisation, MaxUpsertAge: number = Infinity) {
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
