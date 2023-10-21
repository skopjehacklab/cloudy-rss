import { Feed, FeedItem, FeedSyncronisation } from '@cloudy-rss/shared'
import {
  FeedItemTable,
  FeedSyncronisationTable,
  FeedTable,
  UserSubscriptionTable,
} from './lib/model'

import Parser from 'rss-parser'
import { syncFeed } from './lib/sync-rss'

const MinFeedAge = 5 * 60 * 1000

// Maximum item age relative to previously updatedAt item
const MaxUpsertAge = 5 * 60 * 1000

// Do not retry to sync failed feeds more often than every 15m
const MinSyncAgeFailedFeed = 15 * 60 * 1000

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
        minRequestedFrequency
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
    await Promise.all(syncsToProcess.slice(k, k + 10).map(feed => syncFeed(feed, MaxUpsertAge)))
  }
}
