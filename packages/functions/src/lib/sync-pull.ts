import { Feed, FeedItem, UserFeedItemRead, UserSubscription } from '@cloudy-rss/shared'
import { FeedTable, FeedItemTable, UserFeedItemReadTable, UserSubscriptionTable } from './model'

type Timestamp = number

type PullMigration = {
  from: number
  tables: string[]
  columns: { table: string; columns: string[] }[]
}

interface PullParameters {
  lastPulledAt: Timestamp
  schemaVersion: number
  migration: null | PullMigration
}

type ChangeSpecs<T> = {
  created: Array<T>
  updated: Array<T>
  deleted: Array<T>
}

type PullResponse = {
  feeds: ChangeSpecs<Feed>
  feedItems: ChangeSpecs<FeedItem>
  userSubscriptions: ChangeSpecs<UserSubscription>
  feedItemReads: ChangeSpecs<UserFeedItemRead>
}

function splitData<T extends { deleted: boolean; createdAt: number; updatedAt: number }>(
  data: T[],
  lastPulledAt: number
) {
  let created = data.filter(x => x.createdAt > lastPulledAt && !x.deleted)
  let updated = data.filter(
    x => x.createdAt <= lastPulledAt && x.updatedAt > lastPulledAt && !x.deleted
  )
  let deleted = data.filter(x => x.updatedAt <= lastPulledAt && x.deleted)
  return { created, updated, deleted }
}

export async function pullChanges(userId: string, params: PullParameters): Promise<PullResponse> {
  let pullResponse: PullResponse = {
    feeds: { created: [], updated: [], deleted: [] },
    feedItemReads: { created: [], updated: [], deleted: [] },
    feedItems: { created: [], updated: [], deleted: [] },
    userSubscriptions: { created: [], updated: [], deleted: [] },
  }

  let userSubscriptions = await UserSubscriptionTable.query
    .byUserId({ userId })
    .gt({
      updatedAt: params.lastPulledAt,
    })
    .go()

  pullResponse.userSubscriptions = splitData(userSubscriptions.data, params.lastPulledAt)

  let feedItems: FeedItem[] = []

  let feeds: Feed[] = []

  // Unfortunately, this is not quite right. A feed may've had new items synced
  // even if the subscription was not updated. To fix this, we'd need to query
  // the feed table for all feeds that have been synced since lastPulledAt and
  // then query the feed item table for all items that have been synced since
  for (let item of userSubscriptions.data) {
    let feedId = item.feedId
    let feedItemsForFeed = await FeedItemTable.query
      .byFeedIdUpdatedAt({ feedId })
      .gt({
        updatedAt: params.lastPulledAt,
      })
      .go()
    feedItems.push(...feedItemsForFeed.data)

    // Unfortunately, could not find a way to do this in a single query
    let feed = await FeedTable.query.byFeedId({ feedId }).go()
    feeds.push(...feed.data)
  }
  pullResponse.feedItems = splitData(feedItems, params.lastPulledAt)
  pullResponse.feeds = splitData(feeds, params.lastPulledAt)

  let feedItemReads = await UserFeedItemReadTable.query
    .byUserId({ userId })
    .gt({
      updatedAt: params.lastPulledAt,
    })
    .go()

  pullResponse.feedItemReads = splitData(feedItemReads.data, params.lastPulledAt)

  return pullResponse
}
