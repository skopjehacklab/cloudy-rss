import { UserFeedItemReadTable, UserSubscriptionTable, FeedSyncronisationTable } from './model'
import { ChangeSpecs, ChangesObject, FeedSyncronisation } from '@cloudy-rss/shared'
import { syncFeed } from './sync-rss'

function joinChanges<T>(changes: ChangeSpecs<T>) {
  return changes.created.concat(changes.updated || [], changes.deleted || [])
}
export async function pushChanges(userId: string, changes: ChangesObject) {
  let lastUpdatedAt = Date.now()

  let userSubscriptions = joinChanges(changes.userSubscriptions)
    .map(x => ({ ...x, updatedAt: lastUpdatedAt }))
    .filter(x => x.userId === userId)

  // This can get expensive over time, but we're only processing updates since last sync
  if (userSubscriptions.length > 0) {
    let synchronizationsRequests = await FeedSyncronisationTable.get(
      userSubscriptions.map(({ url }) => ({ url }))
    ).go()

    let synhronizationsByUrl = new Map(synchronizationsRequests.data.map(x => [x.url, x.feedId]))

    // Create synchronizations for missing subscriptions
    let missingSyncronizations: FeedSyncronisation[] = userSubscriptions
      .filter(us => !synhronizationsByUrl.has(us.url))
      .map(us => ({
        url: us.url,
        feedId: us.feedId,
        syncStartedAt: 0,
        syncCompletedAt: 0,
        state: 'SYNCED',
      }))

    // Make sure they are added to the database
    await Promise.all(missingSyncronizations.map(x => FeedSyncronisationTable.upsert(x).go()))

    // Run an early sync on the missing subscriptions, for UX reasons, but ignore if it fails
    try {
      await Promise.all(missingSyncronizations.map(syncFeed))
    } catch (e) {}

    let feedIdByUrl = new Map([
      ...missingSyncronizations.map(x => [x.url, x.feedId] as const),
      ...synhronizationsByUrl.entries(),
    ])

    // First, fix all subscriptions that don't match the correct feedId
    let fixedSubscriptions = userSubscriptions.map(us => ({
      ...us,
      feedId: feedIdByUrl.get(us.url),
    }))

    // We are assuming there won't be many changes, so we can do them one at a time
    await Promise.all(
      fixedSubscriptions
        .filter(x => x.userId === userId)
        .map(x => UserSubscriptionTable.upsert({ ...x, updatedAt: lastUpdatedAt }).go())
    )
  }

  let feedItemReads = joinChanges(changes.userFeedItemReads)

  if (feedItemReads.length > 0) {
    console.log('New reads', joinChanges(changes.userFeedItemReads))
    // We might need to be careful here if we implement mass read/unread functionality
    let changeItemReads = await Promise.all(
      joinChanges(changes.userFeedItemReads)
        .filter(x => x?.userId === userId)
        .map(x => UserFeedItemReadTable.upsert({ ...x, updatedAt: lastUpdatedAt }).go())
    )
  }
}
