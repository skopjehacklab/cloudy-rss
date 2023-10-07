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
  if (change.type == DatabaseChangeType.Delete) return change.key as string
  throw new Error('Unknown change type')
}

function dexieChangeListToChangesObject(changes: IDatabaseChange[]): ChangesObject {
  return Object.fromEntries(
    changes
      .group(c => c.table)
      .map(([tableName, changes]) => [
        tableName,
        Object.fromEntries(
          changes
            .group(c => DatabaseChangeTypeMap[c.type])
            .map(([type, changes]) => [type, changes.map((c = dexieChangeToBackendChange))])
        )
      ])
  ) as ChangesObject
}

export class DBSyncronizer implements ISyncProtocol {
  private syncInterval?: ReturnType<typeof setInterval>

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
    })
  }

  async syncAsync(args: {
    context: IPersistedContext
    url: string
    options: any
    baseRevision: any
    syncedRevision: any
    changes: IDatabaseChange[]
    partial: boolean
    applyRemoteChanges: ApplyRemoteChangesFunction
    onChangesAccepted: () => void
    onSuccess: (continuation: PollContinuation | ReactiveContinuation) => void
    onError: (error: any, again?: number | undefined) => void
  }): Promise<void> {
    let currentToken = await waitUntilDefined(this.opts.token)
    let { changes, lastPulledAt } = await this.pullChanges({
      lastPulledAt: args.syncedRevision,
      schemaVersion: args.context.db.verno,
      migration: args.context.db._cfg.migration
    })
    await args.applyRemoteChanges(changes, lastPulledAt)

    let changesObject = dexieChangeListToChangesObject(
      args.changes.filter(c => TablesToSync.includes(c.table))
    )

    await this.pushChanges(changesObject as ChangesObject, args.baseRevision)
    args.onChangesAccepted()

    args.onSuccess({
      again: this.opts.syncInterval ?? 60 * 1000
    })
  }

  private async pullChanges(args: {
    lastPulledAt: string | undefined
    schemaVersion: number
    migration: any
  }) {
    let currentToken = await waitUntilDefined(this.opts.token)
    console.log('pulling changes:', args.lastPulledAt)
    const urlParams = `lastPulledAt=${args.lastPulledAt ?? 0}&schemaVersion=${
      args.schemaVersion
    }&migration=${encodeURIComponent(JSON.stringify(args.migration))}`
    const response = await fetch(`${this.opts.apiUrl}/sync/pull?${urlParams}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    })
    if (!response.ok) {
      throw new Error(await response.text())
    }

    const { changes, lastPulledAt } = await response.json()

    console.log(lastPulledAt, changes)
    return { changes, lastPulledAt }
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
