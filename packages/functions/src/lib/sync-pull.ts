import { FeedTable, FeedItemTable, UserFeedItemReadTable, UserSubscriptionTable } from './model'
import { ChangesObject, PullParameters } from './sync-types'

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

type ChangesResponse = {
  changes: ChangesObject
  timestamp: number
}

export async function pullChanges(
  userId: string,
  params: PullParameters
): Promise<ChangesResponse> {
  let pullResponse: ChangesObject = {
    feeds: { created: [], updated: [], deleted: [] },
    feedItemReads: { created: [], updated: [], deleted: [] },
    feedItems: { created: [], updated: [], deleted: [] },
    userSubscriptions: { created: [], updated: [], deleted: [] },
  }

  let timestamp = Date.now()
  let userSubscriptions = await UserSubscriptionTable.query
    .byUserId({ userId })
    .where((attr, op) => op.gt(attr.updatedAt, params.lastPulledAt))
    .go()

  pullResponse.userSubscriptions = splitData(userSubscriptions.data, params.lastPulledAt)

  let userFeeds = await UserSubscriptionTable.query.byUserId({ userId }).go()

  let userFeedIds = userFeeds.data.map(x => x.feedId)

  // The user feeds list may be too large to send as filter expression to DynamoDB (4KB limit)
  let feedsResult = (
    await FeedTable.query.byLastUpdatedAt({}).gt({ updatedAt: params.lastPulledAt }).go()
  ).data.filter(x => userFeedIds.includes(x.feedId))

  pullResponse.feeds = splitData(feedsResult, params.lastPulledAt)

  let allFeedItems = (
    await Promise.all(
      feedsResult.map(({ feedId }) =>
        FeedItemTable.query
          .byFeedIdUpdatedAt({ feedId })
          .gt({ updatedAt: params.lastPulledAt })
          .go()
      )
    )
  ).flatMap(x => x.data)

  pullResponse.feedItems = splitData(allFeedItems, params.lastPulledAt)

  let feedItemReads = await UserFeedItemReadTable.query
    .byUserIdUpdatedAt({ userId })
    .gt({
      updatedAt: params.lastPulledAt,
    })
    .go()

  pullResponse.feedItemReads = splitData(feedItemReads.data, params.lastPulledAt)

  return { changes: pullResponse, timestamp }
}
