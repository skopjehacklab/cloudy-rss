import DynamoDB from 'aws-sdk/clients/dynamodb'
import { Entity, EntityItem, EntityRecord, Service } from 'electrodb'
import { v4 as uuid } from 'uuid'

import * as types from '@cloudy-rss/shared'

const client = new DynamoDB.DocumentClient()
const table = 'electro'

function assertTypeExtends<_T extends U, U>() {}

export let UserTable = new Entity(
  {
    model: {
      entity: 'user',
      version: '1',
      service: 'store',
    },
    attributes: {
      userId: { type: 'string', required: true, default: () => uuid() },
      email: { type: 'string', required: true },
      updatedAt: {
        type: 'number',
        watch: '*',
        set: () => Date.now(),
        readOnly: true,
        required: true,
      },
      createdAt: {
        type: 'number',
        set: () => Date.now(),
        default: () => Date.now(),
        readOnly: true,
        required: true,
      },
    },
    indexes: {
      byEmail: {
        pk: {
          // highlight-next-line
          field: 'pk',
          composite: ['email'],
        },
      },
    },
  },
  { client, table }
)

type User = EntityItem<typeof UserTable>

assertTypeExtends<types.User, User>()
assertTypeExtends<User, types.User>()

export let FeedTable = new Entity(
  {
    model: {
      entity: 'feed',
      version: '1',
      service: 'store',
    },
    attributes: {
      feedId: { type: 'string', required: true, default: () => uuid() },
      title: { type: 'string', required: true },
      category: { type: 'string', required: false },
      description: { type: 'string', required: true },
      url: { type: 'string', required: true },
      image: {
        type: 'map',
        required: false,
        properties: {
          link: { type: 'string', required: true },
          title: { type: 'string', required: true },
          url: { type: 'string', required: true },
          description: { type: 'string' },
          height: { type: 'number', default: () => 31 },
          width: { type: 'number', default: () => 88 },
        },
      },
      lastBuildDate: { type: 'number' },
      pubDate: { type: 'number' },

      skipDays: { type: 'list', items: { type: 'string' } },
      skipHours: { type: 'list', items: { type: 'number' } },
      ttl: { type: 'number' },

      syncStartedAt: { type: 'number' },
      syncCompletedAt: {
        type: 'number',
      },
      state: { type: ['SYNCED', 'SYNCING'] as const, required: true },

      updatedAt: {
        type: 'number',
        watch: '*',
        set: () => Date.now(),
        readOnly: true,
        required: true,
      },
      createdAt: {
        type: 'number',
        set: () => Date.now(),
        default: () => Date.now(),
        readOnly: true,
        required: true,
      },
      deleted: { type: 'boolean', required: true },
    },
    indexes: {
      byFeedId: {
        pk: {
          field: 'pk',
          composite: ['feedId'],
        },
        sk: {
          field: 'sk',
          composite: [],
        },
      },
      // For efficient scheduled sync
      bySyncCompletedAt: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: [],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['syncCompletedAt', 'url'],
        },
      },
      // For efficient pulls
      byLastUpdatedAt: {
        index: 'gsi2pk-gsi2sk-index',
        pk: {
          field: 'gsi2pk',
          composite: [],
        },
        sk: {
          field: 'gsi2sk',
          composite: ['lastUpdatedAt', 'url'],
        },
      },
    },
  },
  { client, table }
)

type Feed = EntityItem<typeof FeedTable>

assertTypeExtends<types.Feed, Feed>()
assertTypeExtends<Feed, types.Feed>()

/*
type FeedItem = {
  feedId: string
  pubDate: number
  guid: string
  title: string
  description: string
  author: string
  category?: string

  link: string
  enclosure: {
    type: string
    url: string
    length: number
  }

  createdAt: number
  updatedAt: number
  deleted: boolean
}
*/

export let FeedItemTable = new Entity({
  model: {
    entity: 'feedItem',
    version: '1',
    service: 'store',
  },
  attributes: {
    feedId: { type: 'string', required: true },
    pubDate: { type: 'number', required: true },
    guid: { type: 'string', required: true },
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    link: { type: 'string', required: true },

    author: { type: 'string' },
    category: { type: 'string' },
    enclosure: {
      type: 'map',
      properties: {
        type: { type: 'string', required: true },
        url: { type: 'string', required: true },
        length: { type: 'number', required: true },
      },
    },
    createdAt: {
      type: 'number',
      default: () => Date.now(),
      readOnly: true,
      required: true,
    },
    updatedAt: {
      type: 'number',
      watch: '*',
      set: () => Date.now(),
      readOnly: true,
      required: true,
    },
    deleted: { type: 'boolean', required: true },
  },
  indexes: {
    byFeedIdUpdatedAt: {
      index: 'gsi1pk-gsi1sk-index',
      pk: {
        field: 'pk',
        composite: ['feedId'],
      },
      sk: {
        field: 'sk',
        composite: ['updatedAt'],
      },
    },
  },
})

type FeedItem = EntityItem<typeof FeedItemTable>

assertTypeExtends<types.FeedItem, FeedItem>()
assertTypeExtends<FeedItem, types.FeedItem>()

export let UserSubscriptionTable = new Entity({
  model: {
    entity: 'userSubscription',
    version: '1',
    service: 'store',
  },
  attributes: {
    userId: { type: 'string', required: true },
    feedId: { type: 'string', required: true },
    requestedFrequency: { type: 'number', required: true },
    createdAt: {
      type: 'number',
      default: () => Date.now(),
      readOnly: true,
    },
    updatedAt: {
      type: 'number',
      watch: '*',
      set: () => Date.now(),
      readOnly: true,
    },
    deleted: { type: 'boolean' },
  },
  indexes: {
    byUserId: {
      pk: {
        field: 'pk',
        composite: ['userId'],
      },
      sk: {
        field: 'sk',
        composite: ['updatedAt'],
      },
    },
    byFeedId: {
      // for fetching min update frequency
      pk: {
        field: 'pk',
        composite: ['feedId'],
      },
      sk: {
        field: 'sk',
        composite: ['updateFrequency'],
      },
    },
  },
})

type UserSubscription = EntityRecord<typeof UserSubscriptionTable>

assertTypeExtends<types.UserSubscription, UserSubscription>()
assertTypeExtends<UserSubscription, types.UserSubscription>()

export let UserFeedItemReadTable = new Entity({
  model: {
    entity: 'userFeedItemRead',
    version: '1',
    service: 'store',
  },
  attributes: {
    userId: { type: 'string', required: true },
    feedItemId: { type: 'string', required: true },
    deleted: { type: 'boolean', required: true },
    createdAt: {
      type: 'number',
      default: () => Date.now(),
      readOnly: true,
      required: true,
    },
    updatedAt: {
      type: 'number',
      watch: '*',
      set: () => Date.now(),
      readOnly: true,
      required: true,
    },
  },
  indexes: {
    byUserId: {
      pk: {
        field: 'pk',
        composite: ['userId'],
      },
      sk: {
        field: 'sk',
        composite: ['updatedAt'],
      },
    },
  },
})

type UserFeedItemRead = EntityRecord<typeof UserFeedItemReadTable>
assertTypeExtends<types.UserFeedItemRead, UserFeedItemRead>()
assertTypeExtends<UserFeedItemRead, types.UserFeedItemRead>()

export let FeedDataSync = new Service(
  {
    feed: FeedTable,
    feedItems: FeedItemTable,
  },
  { table, client }
)
