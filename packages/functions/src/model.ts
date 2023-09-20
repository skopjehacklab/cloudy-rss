import DynamoDB from 'aws-sdk/clients/dynamodb'
import { Entity, EntityRecord } from 'electrodb'

import * as types from '@tinier-rss/shared'

import { v4 as uuid } from 'uuid'
import { assert } from 'console'
import { type } from 'os'
const client = new DynamoDB.DocumentClient()

const table = 'electro'

function assertTypeExtends<_T extends U, U>() {}

const UserTable = new Entity(
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
        // watch for changes to any attribute
        watch: '*',
        // set current timestamp when updated
        set: () => Date.now(),
        readOnly: true,
      },
      createdAt: {
        type: 'number',
        default: () => Date.now(),
        readOnly: true,
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

type User = EntityRecord<typeof UserTable>

assertTypeExtends<types.User, User>()
assertTypeExtends<User, types.User>()

const FeedTable = new Entity(
  {
    model: {
      entity: 'feed',
      version: '1',
      service: 'store',
    },
    attributes: {
      feedId: { type: 'string', required: true, default: () => uuid() },
      url: { type: 'string', required: true },
      updatedAt: {
        type: 'number',
        watch: '*',
        set: () => Date.now(),
        readOnly: true,
      },
      createdAt: {
        type: 'number',
        default: () => Date.now(),
        readOnly: true,
      },
      syncStartedAt: {
        type: 'number',
        default: () => 0,
      },
      syncCompletedAt: {
        type: 'number',
        default: () => 0,
      },
      image: { type: 'string', required: false },
      buildDate: { type: 'number' },
      pubDate: { type: 'number' },
      state: { type: ['SYNCED', 'SYNCING'] as const },
      deleted: { type: 'boolean' },
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
      // For efficient scheduled pulls
      byUpdatedAt: {
        index: 'gsi1pk-gsi1sk-index',
        pk: {
          field: 'pk',
          composite: [],
        },
        sk: {
          field: 'sk',
          composite: ['updatedAt'],
        },
      },
    },
  },
  { client, table }
)

type Feed = EntityRecord<typeof FeedTable>

assertTypeExtends<types.Feed, Feed>()
assertTypeExtends<Feed, types.Feed>()

let FeedItemTable = new Entity({
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

type FeedItem = EntityRecord<typeof FeedItemTable>

assertTypeExtends<types.FeedItem, FeedItem>()
assertTypeExtends<FeedItem, types.FeedItem>()

let UserSubscriptionTable = new Entity({
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
        composite: ['feedId'],
      },
    },
  },
})

type UserSubscription = EntityRecord<typeof UserSubscriptionTable>

assertTypeExtends<types.UserSubscription, UserSubscription>()
assertTypeExtends<UserSubscription, types.UserSubscription>()

let UserFeedItemReadTable = new Entity({
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
    },
    updatedAt: {
      type: 'number',
      watch: '*',
      set: () => Date.now(),
      readOnly: true,
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
        composite: ['feedItemId'],
      },
    },
  },
})

type UserFeedItemRead = EntityRecord<typeof UserFeedItemReadTable>
assertTypeExtends<types.UserFeedItemRead, UserFeedItemRead>()
assertTypeExtends<UserFeedItemRead, types.UserFeedItemRead>()
