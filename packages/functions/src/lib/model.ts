import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { Entity, EntityItem, EntityRecord, Service } from 'electrodb'
import { v4 as uuid } from 'uuid'

import * as types from '@cloudy-rss/shared'

const client = new DynamoDB()
const table = process.env.TABLE_NAME as string

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

export let FeedSyncronisationTable = new Entity(
  {
    model: {
      entity: 'feedSyncronisation',
      version: '1',
      service: 'store',
    },
    attributes: {
      feedId: { type: 'string', required: true },
      url: { type: 'string', required: true },
      syncStartedAt: { type: 'number', required: true, default: 0 },
      syncCompletedAt: { type: 'number', required: true, default: 0 },
      state: { type: ['SYNCED', 'SYNCING', 'FAILED'] as const, required: true },
    },
    indexes: {
      byUrl: {
        pk: {
          field: 'pk',
          composite: ['url'],
        },
        sk: {
          // We ideally want one record per url. However, race conditions may cause multiple
          // simultaneous subscriptions to result in multiple records. A reconciliation process
          // will ensure that only one record is kept per url.
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
    },
  },
  { client, table }
)

type FeedSyncronisation = EntityItem<typeof FeedSyncronisationTable>

assertTypeExtends<types.FeedSyncronisation, FeedSyncronisation>()
assertTypeExtends<FeedSyncronisation, types.FeedSyncronisation>()

const FeedImageDefaultHeight = 31
const FeedImageDefaultWidth = 88

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
          height: { type: 'number', default: FeedImageDefaultHeight },
          width: { type: 'number', default: FeedImageDefaultWidth },
        },
      },
      lastBuildDate: { type: 'number' },
      pubDate: { type: 'number' },

      skipDays: { type: 'list', items: { type: 'string' } },
      skipHours: { type: 'list', items: { type: 'number' } },
      ttl: { type: 'number' },

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
      deleted: { type: 'boolean', required: true, default: false },
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
      // For efficient pulls
      byLastUpdatedAt: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: [],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['updatedAt', 'url'],
        },
      },
    },
  },
  { client, table }
)

type Feed = EntityItem<typeof FeedTable>

assertTypeExtends<types.Feed, Feed>()
assertTypeExtends<Feed, types.Feed>()

export let FeedItemTable = new Entity(
  {
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
      byId: {
        pk: {
          field: 'pk',
          composite: ['feedId'],
        },
        sk: {
          field: 'sk',
          composite: ['guid'],
        },
      },
      byFeedIdUpdatedAt: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['feedId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['updatedAt'],
        },
      },
    },
  },
  { client, table }
)
type FeedItem = EntityItem<typeof FeedItemTable>

assertTypeExtends<types.FeedItem, FeedItem>()
assertTypeExtends<FeedItem, types.FeedItem>()

export let UserSubscriptionTable = new Entity(
  {
    model: {
      entity: 'userSubscription',
      version: '1',
      service: 'store',
    },
    attributes: {
      userId: { type: 'string', required: true },
      feedId: { type: 'string', required: true },
      url: { type: 'string', required: true },
      requestedFrequency: { type: 'number', required: true },
      createdAt: {
        type: 'number',
        default: () => Date.now(),
        set: () => Date.now(),
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
      deleted: { type: 'boolean', required: true, default: false },
    },
    indexes: {
      byUserId: {
        pk: {
          field: 'pk',
          composite: ['userId'],
        },
        sk: {
          field: 'sk',
          composite: ['feedId'],
        },
      },
      byFeedId: {
        index: 'gsi1pk-gsi1sk-index',
        // for fetching min update frequency
        pk: {
          field: 'gsi1pk',
          composite: ['feedId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['requestedFrequency'],
        },
      },
    },
  },
  { client, table }
)

type UserSubscription = EntityRecord<typeof UserSubscriptionTable>

assertTypeExtends<types.UserSubscription, UserSubscription>()
assertTypeExtends<UserSubscription, types.UserSubscription>()

export let UserFeedItemReadTable = new Entity(
  {
    model: {
      entity: 'userFeedItemRead',
      version: '1',
      service: 'store',
    },
    attributes: {
      userId: { type: 'string', required: true },
      guid: { type: 'string', required: true },
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
          composite: ['guid'],
        },
      },
      byUserIdUpdatedAt: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'gsi1pk',
          composite: ['userId'],
        },
        sk: {
          field: 'gsi1sk',
          composite: ['updatedAt'],
        },
      },
    },
  },
  { client, table }
)

type UserFeedItemRead = EntityRecord<typeof UserFeedItemReadTable>
assertTypeExtends<types.UserFeedItemRead, UserFeedItemRead>()
assertTypeExtends<UserFeedItemRead, types.UserFeedItemRead>()
