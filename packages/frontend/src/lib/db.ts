import { z } from 'zod'

let zs = z.object({
  name: z.string()
})

type test = z.infer<typeof zs>

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = e => resolve(req.result)
    req.onerror = err => reject(req.error)
  })
}

type IndexKeys<T> =
  | [keyof T & string]
  | [keyof T & string, keyof T & string]
  | [keyof T & string, keyof T & string, keyof T & string]

type IndexSchema<T, Keys extends IndexKeys<T>> = {
  key: Keys
  unique?: boolean
}

type IndexMapSchema<T> = {
  [key: string]: IndexSchema<T, IndexKeys<T>>
}

type CollectionSchema<T, PKey extends IndexKeys<T>, Ix extends IndexMapSchema<T>> = {
  fields: z.ZodType<T>
  primaryKey: PKey
  indexes: Ix
}

type CollectionTypeMap<M> = {
  [K in keyof M]: M[K]
}

type CollectionMapSchema<M> = {
  [K in keyof M]: CollectionSchema<M[K], IndexKeys<M[K]>, IndexMapSchema<M[K]>>
}

type DBSchema<M> = {
  version: number
  migrations: Array<(db: IDBDatabase) => Promise<void>>
  collections: CollectionMapSchema<M>
}

async function createDB<S extends DBSchema<any>>(name: string, schema: S): Promise<S> {
  const request = window.indexedDB.open(name, schema.version)
  request.onupgradeneeded = async evt => {
    const db = request.result

    let existingStores = new Set(db.objectStoreNames)

    for (let [name, col] of Object.entries(schema.collections)) {
      let collection = col as CollectionSchema<any, any, any>

      let store = existingStores.has(name)
        ? request.transaction!.objectStore(name)
        : db.createObjectStore(name, {
            keyPath: collection.primaryKey
          })

      let existingIndexes = new Set(store.indexNames)

      for (let [indexName, ix] of Object.entries(collection.indexes)) {
        if (!existingIndexes.has(indexName)) {
          let index = ix as IndexSchema<any, any>
          store.createIndex(indexName, index.key, {
            unique: index.unique
          })
        } else {
        }
      }
    }

    for (const [ix, migration] of schema.migrations.entries()) {
      if (ix + 1 > evt.oldVersion) {
        await migration(db)
      }
    }
  }
  let db = await reqToPromise(request)

  for (let [name, col] of Object.entries(schema.collections)) {
  }
  return schema
}

type PKeyType<T, PKey> = {
  [K in keyof T]: T[K] extends PKey ? K : never
}

class Collection<T, PKey extends IndexKeys<T>, Ix extends IndexMapSchema<T>> {
  public query!: {
    [K in keyof Ix]: Ix extends IndexSchema<T, infer Keys> ? CollectionIndex<T, Keys> : never
  }

  private pk!: CollectionIndex<T, PKey>

  constructor(
    private name: string,
    private schema: CollectionSchema<T, PKey, Ix>,
    private db: IDBDatabase
  ) {
    this.query = {} as any
    for (let [name, ix] of Object.entries(schema.indexes)) {
      this.query[name as keyof Ix] = new CollectionIndex(this.name, name, ix as any, db) as any
    }
    this.pk = new CollectionIndex(
      this.name,
      'pk',
      {
        key: schema.primaryKey,
        unique: true
      },
      this.db
    )
  }

  public async put(item: T) {
    let tx = this.db.transaction(this.name, 'readwrite')
    let store = tx.objectStore(this.name)
    await reqToPromise(store.put(item))
    tx.commit()
  }

  public async batchPut(items: T[]) {
    let tx = this.db.transaction(this.name, 'readwrite')
    let store = tx.objectStore(this.name)
    await Promise.all(items.map(item => reqToPromise(store.put(item))))
    tx.commit()
  }

  public async get(id: PKeyType<T, PKey>) {
    let tx = this.db.transaction(this.name, 'readonly')
    let store = tx.objectStore(this.name)

    let req = store.get(this.schema.primaryKey.map(k => id[k]))
    return await reqToPromise(req)
  }

  public async delete(id: PKeyType<T, PKey>) {
    let tx = this.db.transaction(this.name, 'readwrite')
    let store = tx.objectStore(this.name)
    await reqToPromise(store.delete(this.schema.primaryKey.map(k => id[k])))
    tx.commit()
  }
}

class CollectionIndex<T, Keys extends IndexKeys<T>> {
  constructor(
    private collectionName: string,
    private indexName: string,
    private schema: IndexSchema<T, Keys>,
    private db: IDBDatabase
  ) {}
}

function createCollection<T, PKey extends IndexKeys<T>, Ix extends IndexMapSchema<T>>(
  col: CollectionSchema<T, PKey, Ix>
) {
  return col
}

let db = await createDB('rss', {
  version: 1,
  migrations: [],
  collections: {
    feeds: createCollection({
      fields: z.object({
        feedId: z.string(),
        url: z.string(),
        description: z.string(),
        title: z.string()
      }),
      primaryKey: ['feedId'],
      indexes: {
        byUrl: { key: ['url'] }
      }
    })
  }
})
