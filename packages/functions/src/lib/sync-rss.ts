import { FeedSyncronisation, Feed, FeedItem } from '@cloudy-rss/shared'
// import Parser from 'rss-parser'
import { FeedSyncronisationTable, FeedTable, FeedItemTable } from './model'
import { enhanceError } from './errors'
import FeedParser from 'feedparser'

async function parseFeed(
  url: string,
  text: string
): Promise<{ items: FeedParser.Item[]; feed: FeedParser.Meta }> {
  return new Promise((resolve, reject) => {
    let fp = new FeedParser({
      feedurl: url,
    })
    let result = { items: [] as any, feed: null as any }

    fp.on('error', reject)
    fp.on('readable', function () {
      for (let post = fp.read(); post != null; post = fp.read()) {
        result.items.push(post)
      }
    })
    fp.on('meta', (meta: FeedParser.Meta) => (result.feed = meta))
    fp.on('end', () => resolve(result))
    fp.on('finish', () => resolve(result))

    fp.end(text)
  })
}
/**
 * Sync a single feed
 * @param feedSync the feed to sync
 * @param MaxUpsertAge the maximum age of an item relative to the last updated item to consider it for upsert
 */
export async function syncFeed(feedSync: FeedSyncronisation, MaxUpsertAge: number = Infinity) {
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

    console.log('Parsing feed', feedSync.url)
    let { feed, items } = await parseFeed(feedSync.url, text).catch(
      enhanceError(`Failed to parse ${feedSync.url}`)
    )

    let feedObject: Feed = {
      url: feedSync.url,
      title: feed.title,
      description: feed.description ?? '',
      feedId: feedSync.feedId,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      deleted: false,
      author: feed.author ?? '',
      category: feed.categories?.join(','),
      image: { link: feed.link, title: feed.image.title, url: feed.image.url },
      lastBuildDate: feed.date?.toISOString() || new Date().toISOString(),
      pubDate: feed.pubdate?.toISOString() || new Date().toISOString(),
      skipDays: undefined,
      skipHours: undefined,
      ttl: undefined,
    }
    await FeedTable.upsert(feedObject).go()

    let lastUpdatedItem = await FeedItemTable.query
      .byFeedIdUpdatedAt({ feedId: feedSync.feedId })
      .go({ limit: 1, order: 'desc' })

    let lastItemTimestamp = lastUpdatedItem.data[0]?.updatedAt ?? 0
    let lastConsideredTimestamp = Math.max(0, lastItemTimestamp - MaxUpsertAge)

    let feedItems: FeedItem[] = items
      .filter(item => !item.pubdate || item.pubdate.valueOf() > lastConsideredTimestamp)
      .map(item => ({
        feedId: feedSync.feedId,
        guid: item.guid ?? item.link!,
        title: item.title ?? '',
        description: item.summary ?? '',
        author: item.author ?? '',
        category: item.categories?.join(','),
        link: item.link!,
        enclosure: item.enclosures
          ? {
              url: item.enclosures[0].url,
              length: item.enclosures[0].length ? Number(item.enclosures[0].length) : undefined,
              type: item.enclosures[0].type,
            }
          : undefined,
        pubDate: item.pubdate?.toISOString() ?? new Date().toISOString(),
        content: item.description != item.summary ? item.description : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deleted: false,
      }))

    // TODO: put does not update items, only inserts
    console.log('Will update', feedItems.length, 'of', items.length, 'items for', feedSync.url)
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
