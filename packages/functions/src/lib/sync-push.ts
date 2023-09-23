import { join } from 'path'
import { FeedTable, FeedItemTable, UserFeedItemReadTable, UserSubscriptionTable } from './model'
import { ChangeSpecs, ChangesObject, PullParameters } from './sync-types'

function joinChanges<T>(changes: ChangeSpecs<T>) {
  return changes.created.concat(changes.updated, changes.deleted)
}
export async function pushChanges(userId: string, changes: ChangesObject) {
  // We are assuming there won't be many changes, so we can do them one at a time

  let changeSubscriptions = await Promise.all(
    joinChanges(changes.userSubscriptions)
      .filter(x => x.userId === userId)
      .map(x => UserSubscriptionTable.upsert(x).go())
  )

  // We might need to be careful here if we implement mass read/unread functionality
  let changeItemReads = await Promise.all(
    joinChanges(changes.feedItemReads)
      .filter(x => x.userId === userId)
      .map(x => UserFeedItemReadTable.upsert(x).go())
  )
}
