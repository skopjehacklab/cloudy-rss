import type { Readable } from 'svelte/store'
import { waitUntilDefined } from './util'

import '../lib/shim'

import type {
  ApplyRemoteChangesFunction,
  IPersistedContext,
  ISyncProtocol,
  PollContinuation,
  ReactiveContinuation
} from 'dexie-syncable/api'
import type {
  ICreateChange,
  IDatabaseChange,
  IDeleteChange,
  IUpdateChange
} from 'dexie-observable/api'
import type { ChangesObject } from '@cloudy-rss/shared'

const TablesToSync = ['userFeedItemReads', 'userSubscriptions']

enum DatabaseChangeType {
  Create = 1,
  Update = 2,
  Delete = 3
}

const DatabaseChangeTypeMap = {
  [DatabaseChangeType.Create]: 'created' as const,
  [DatabaseChangeType.Update]: 'updated' as const,
  [DatabaseChangeType.Delete]: 'deleted' as const
}

const InverseDatabaseChangeTypeMap = Object.fromEntries(
  Object.entries(DatabaseChangeTypeMap).map(([k, v]) => [v, k])
)

type DexieToBackend<
  ObjectType,
  ChangeType extends IDatabaseChange
> = ChangeType extends ICreateChange
  ? ObjectType
  : ChangeType extends IUpdateChange
  ? Partial<ObjectType>
  : ChangeType extends IDeleteChange
  ? string
  : never

function dexieChangeToBackendChange<T>(change: IDatabaseChange): T | string {
  if (change.type == DatabaseChangeType.Create) return change.obj as T
  if (change.type == DatabaseChangeType.Update) return change.obj as T
  if (change.type == DatabaseChangeType.Delete)
    return Object.assign({}, change.oldObj, { deleted: true }) as T

  throw new Error('Unknown change type')
}

function dexieChangeListToChangesObject(changes: IDatabaseChange[]): ChangesObject {
  let baseChangesObject: ChangesObject = {
    userFeedItemReads: { created: [], updated: [], deleted: [] },
    userSubscriptions: { created: [], updated: [], deleted: [] },
    feeds: { created: [], updated: [], deleted: [] },
    feedItems: { created: [], updated: [], deleted: [] }
  }
  let augmentedChanges = Object.fromEntries(
    changes
      .group(c => c.table)
      .map(([tableName, changes]) => [
        tableName,
        Object.fromEntries(
          changes
            .group(c => DatabaseChangeTypeMap[c.type])
            .map(([type, changes]) => [type, changes.map(dexieChangeToBackendChange)])
        )
      ])
  ) as ChangesObject

  Object.assign(baseChangesObject.feedItems, augmentedChanges.feedItems)
  Object.assign(baseChangesObject.feeds, augmentedChanges.feeds)
  Object.assign(baseChangesObject.userSubscriptions, augmentedChanges.userSubscriptions)
  Object.assign(baseChangesObject.userFeedItemReads, augmentedChanges.userFeedItemReads)

  return baseChangesObject
}

// Todo: we must create update objects as per spec here
// https://dexie.org/docs/Syncable/Dexie.Syncable.IDatabaseChange
// Deletes must be a key, while updates must contain update paths and values
// To work around this limitation and force dexie to always use bulkPut
// we can represent all types of changes as creates
function changesObjectToDexieChangelist(changes: ChangesObject): IDatabaseChange[] {
  return Object.entries(changes).flatMap(([tableName, changes]) =>
    Object.entries(changes).flatMap(([type, changes]) =>
      changes.map((change: any) => ({
        table: tableName,
        type: InverseDatabaseChangeTypeMap['created'],
        obj: change, //type === 'deleted' ? change : change,
        oldObj: change //type === 'deleted' ? change : change
        // TODO: unclear if deleted changes need object ID or not
      }))
    )
  )
}

export class DBSyncronizer implements ISyncProtocol {
  private syncInterval?: ReturnType<typeof setInterval>
  private syncTimeout?: ReturnType<typeof setTimeout>

  constructor(
    private opts: {
      apiUrl: string
      token: Readable<string | undefined>
      syncInterval?: number
    }
  ) {}
  partialsThreshold?: number | undefined
  sync(
    context: IPersistedContext,
    url: string,
    options: any,
    baseRevision: any,
    syncedRevision: any,
    changes: IDatabaseChange[],
    partial: boolean,
    applyRemoteChanges: ApplyRemoteChangesFunction,
    onChangesAccepted: () => void,
    onSuccess: (continuation: PollContinuation | ReactiveContinuation) => void,
    onError: (error: any, again?: number | undefined) => void
  ): void {
    this.syncAsync({
      context,
      url,
      options,
      baseRevision,
      syncedRevision,
      changes,
      partial,
      applyRemoteChanges,
      onChangesAccepted,
      onSuccess,
      onError
    }).then(
      syncedRevision => {
        console.log('initial sync done')

        let pullSync = async () => {
          console.log('polling for server changes')
          let { changes, lastUpdatedAt } = await this.pullChanges(syncedRevision)
          let incomingDexieChanges = changesObjectToDexieChangelist(changes)
          await applyRemoteChanges(incomingDexieChanges, lastUpdatedAt) // will update sync rev
          syncedRevision = lastUpdatedAt
        }

        this.syncInterval = setInterval(pullSync, this.opts.syncInterval ?? 60 * 1000)

        onSuccess({
          // again: this.opts.syncInterval ?? 10 * 1000
          react: async (changes, baseRevision, partial, onChangesAccepted) => {
            let outgoingDexieChanges = changes.filter(c => TablesToSync.includes(c.table))
            if (outgoingDexieChanges.length > 0) {
              let outgoingChanges = dexieChangeListToChangesObject(outgoingDexieChanges)
              await this.pushChanges(outgoingChanges, baseRevision)

              //Reschedule sync, one 1 second later and one for the regular interval
              if (this.syncTimeout) {
                clearTimeout(this.syncTimeout)
              }
              this.syncTimeout = setTimeout(pullSync, 1 * 1000)
              if (this.syncInterval) {
                clearInterval(this.syncInterval)
              }
              this.syncInterval = setInterval(pullSync, this.opts.syncInterval ?? 60 * 1000)
            }
            onChangesAccepted()
          },
          disconnect: () => {
            if (this.syncInterval) {
              clearInterval(this.syncInterval)
            }
            if (this.syncTimeout) {
              clearTimeout(this.syncTimeout)
            }
          }
        })
      },
      err => {
        console.error('sync error', err)
        onError(err, this.opts.syncInterval ?? 60 * 1000)
      }
    )
  }

  async syncAsync(args: {
    context: IPersistedContext
    url: string
    options: any
    baseRevision: number
    syncedRevision: number
    changes: IDatabaseChange[]
    partial: boolean
    applyRemoteChanges: ApplyRemoteChangesFunction
    onChangesAccepted: () => void
    onSuccess: (continuation: PollContinuation | ReactiveContinuation) => void
    onError: (error: any, again?: number | undefined) => void
  }): Promise<number> {
    console.log('Syncing from', args.baseRevision, 'last synced revision', args.syncedRevision)

    let { changes, lastUpdatedAt } = await this.pullChanges(args.syncedRevision)
    let incomingDexieChanges = changesObjectToDexieChangelist(changes)
    await args.applyRemoteChanges(incomingDexieChanges, lastUpdatedAt) // will update sync rev

    let outgoingDexieChanges = args.changes.filter(c => TablesToSync.includes(c.table))
    if (outgoingDexieChanges.length > 0) {
      let outgoingChanges = dexieChangeListToChangesObject(outgoingDexieChanges)
      await this.pushChanges(outgoingChanges, args.baseRevision)
    }
    args.onChangesAccepted()

    return lastUpdatedAt
  }

  private async pullChanges(
    lastPulledAtStart: number | undefined,
    schemaVersion: number = 1,
    migration: any = {}
  ): Promise<{ changes: ChangesObject; lastUpdatedAt: number }> {
    let currentToken = await waitUntilDefined(this.opts.token)
    console.log('pulling changes:', lastPulledAtStart)

    const urlParams = `lastPulledAt=${
      lastPulledAtStart ?? 0
    }&schemaVersion=${schemaVersion}&migration=${encodeURIComponent(JSON.stringify(migration))}`

    const response = await fetch(`${this.opts.apiUrl}/sync/pull?${urlParams}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    const { changes, lastUpdatedAt } = await response.json()
    return { changes, lastUpdatedAt }
  }

  async pushChanges(changes: ChangesObject, lastPulledAt: number | undefined) {
    let currentToken = await waitUntilDefined(this.opts.token)

    console.log('pushing changes', changes, lastPulledAt)

    const response = await fetch(
      `${this.opts.apiUrl}/sync/push?lastPulledAt=${lastPulledAt ?? 0}`,
      {
        method: 'POST',
        body: JSON.stringify(changes),
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      }
    )
    if (!response.ok) {
      throw new Error(await response.text())
    }
  }
}
