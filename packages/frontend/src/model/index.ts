import { Database, Model, appSchema, tableSchema } from '@nozbe/watermelondb'
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'
import { field, json, relation, text } from '@nozbe/watermelondb/decorators'
import * as types from '@cloudy-rss/shared'

function assertTypeExtends<_T extends U, U>() {}

let FeedsTable = tableSchema({
	name: 'feeds',
	columns: [
		{ name: 'feedId', type: 'string', isIndexed: true },
		{ name: 'title', type: 'string' },
		{ name: 'description', type: 'string' },
		{ name: 'url', type: 'string' },
		{ name: 'author', type: 'string', isOptional: true },
		{ name: 'category', type: 'string', isOptional: true },
		{ name: 'lastBuildDate', type: 'number', isOptional: true },
		{ name: 'pubDate', type: 'number', isOptional: true },
		{ name: 'skipDays', type: 'string', isOptional: true },
		{ name: 'skipHours', type: 'string', isOptional: true },
		{ name: 'ttl', type: 'number', isOptional: true },
		{ name: 'syncStartedAt', type: 'number', isOptional: true },
		{ name: 'syncCompletedAt', type: 'number', isOptional: true },
		{ name: 'state', type: 'string' },
		{ name: 'updatedAt', type: 'number' },
		{ name: 'createdAt', type: 'number' },
		{ name: 'deleted', type: 'boolean' }
	]
})

class Feed extends Model {
	static table = 'feeds'

	@field('feedId') feedId!: string
	@text('title') title!: string
	@text('description') description!: string
	@json('image', x => x) image?: {
		link: string
		title: string
		url: string
		description?: string
		height?: number
		width?: number
	}
	@text('url') url!: string
	@text('author') author?: string
	@text('category') category?: string
	@field('lastBuildDate') lastBuildDate?: number
	@field('pubDate') pubDate?: number
	@field('skipDays') skipDays?: string[]
	@field('skipHours') skipHours?: number[]
	@field('ttl') ttl?: number
	@field('updatedAt') updatedAt!: number
	@field('createdAt') createdAt!: number
	@field('deleted') deleted!: boolean
}

type FeedType = Omit<Feed, keyof Model>

assertTypeExtends<FeedType, types.Feed>()
assertTypeExtends<types.Feed, FeedType>()

let FeedItemsTable = tableSchema({
	name: 'feedItems',
	columns: [
		{ name: 'feedId', type: 'string', isIndexed: true },
		{ name: 'pubDate', type: 'number', isIndexed: true },
		{ name: 'guid', type: 'string', isIndexed: true },
		{ name: 'title', type: 'string' },
		{ name: 'description', type: 'string' },
		{ name: 'author', type: 'string', isOptional: true },
		{ name: 'category', type: 'string', isOptional: true },
		{ name: 'link', type: 'string' },
		{ name: 'enclosure', type: 'string', isOptional: true },
		{ name: 'updatedAt', type: 'number' },
		{ name: 'createdAt', type: 'number' },
		{ name: 'deleted', type: 'boolean' }
	]
})

class FeedItem extends Model {
	static table = 'feedItems'

	@field('feedId') feedId!: string
	@field('pubDate') pubDate!: number
	@field('guid') guid!: string
	@text('title') title!: string
	@text('description') description!: string
	@text('author') author?: string
	@text('category') category?: string
	@text('link') link!: string
	@json('enclosure', x => x) enclosure?: {
		type: string
		url: string
		length: number
	}
	@field('updatedAt') updatedAt!: number
	@field('createdAt') createdAt!: number
	@field('deleted') deleted!: boolean
}

type FeedItemType = Omit<FeedItem, keyof Model>

assertTypeExtends<FeedItemType, types.FeedItem>()
assertTypeExtends<types.FeedItem, FeedItemType>()

let UserSubscriptionsTable = tableSchema({
	name: 'userSubscriptions',
	columns: [
		{ name: 'feedId', type: 'string', isIndexed: true },
		{ name: 'userId', type: 'string' },
		{ name: 'requestedFrequency', type: 'number' },
		{ name: 'createdAt', type: 'number' },
		{ name: 'updatedAt', type: 'number' },
		{ name: 'deleted', type: 'boolean' }
	]
})

class UserSubscription extends Model {
	static table = 'userSubscriptions'

	@field('feedId') feedId!: string
	@field('userId') userId!: string
	@field('url') url!: string
	@field('requestedFrequency') requestedFrequency!: number
	@field('updatedAt') updatedAt!: number
	@field('createdAt') createdAt!: number
	@field('deleted') deleted!: boolean
}

type UserSubscriptionType = Omit<UserSubscription, keyof Model>

assertTypeExtends<UserSubscriptionType, types.UserSubscription>()
assertTypeExtends<types.UserSubscription, UserSubscriptionType>()

let UserFeedItemReadsTable = tableSchema({
	name: 'userFeedItemReads',
	columns: [
		{ name: 'userId', type: 'string' },
		{ name: 'feedItemId', type: 'string', isIndexed: true },
		{ name: 'deleted', type: 'boolean' },
		{ name: 'createdAt', type: 'number' },
		{ name: 'updatedAt', type: 'number' }
	]
})

class UserFeedItemRead extends Model {
	static table = 'userFeedItemReads'

	@field('userId') userId!: string
	@field('feedItemId') feedItemId!: string
	@field('deleted') deleted!: boolean
	@field('createdAt') createdAt!: number
	@field('updatedAt') updatedAt!: number
}

export let schema = appSchema({
	version: 1,
	tables: [FeedsTable, FeedItemsTable, UserSubscriptionsTable, UserFeedItemReadsTable]
})

export let migrations = schemaMigrations({
	migrations: [
		// We'll add migration definitions here later
	]
})

import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'

const adapter = new LokiJSAdapter({
	schema,
	// (Comment out migrations for development purposes)
	// migrations,
	useWebWorker: false,
	useIncrementalIndexedDB: true,
	dbName: 'cloudyRSS',

	// --- Optional, but recommended event handlers:
	onQuotaExceededError: error => {
		// Browser ran out of disk space -- TODO: setup event bus
	},
	onSetUpError: error => {
		// Database failed to load -- TODO: setup event bus
	},
	extraIncrementalIDBOptions: {
		onDidOverwrite: () => {
			// Called when this adapter is forced to overwrite contents of IndexedDB.
			// This happens if there's another open tab of the same app that's making changes.
			// Try to synchronize the app now, and if user is offline, alert them that if they close this
			// tab, some data may be lost
		},
		onversionchange: () => {
			// database was deleted in another browser tab (user logged out), so we must make sure we
			// delete it in this tab as well - usually best to just refresh the page
			// if (checkIfUserIsLoggedIn()) {
			window.location.reload()
			// }
		}
	}
})

export let db = new Database({
	adapter,
	modelClasses: [Feed, FeedItem, UserSubscription, UserFeedItemRead]
})

export let m = {
	feeds: db.collections.get<Feed>('feeds'),
	feedItems: db.collections.get<FeedItem>('feedItems'),
	userSubscriptions: db.collections.get<UserSubscription>('userSubscriptions'),
	userFeedItemReads: db.collections.get<UserFeedItemRead>('userFeedItemReads')
}
