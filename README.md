# cloudy-rss

Serverless RSS reader

Requirements
- Login with OIDC, frontend-only
- Email allowlist for logins
- Add feeds to sync
- Refresh my feeds
- Mark items read/unread
- Offline-first, cache feed (and everything else) locally


### Data model

User
- id

UserSubscriptions
- userId
- feedId

Feeds
- id
- url
- syncedAt
- updatedAt
- image (optional)
- buildDate
- pubDate
- state - SYNCED | SYNCING

FeedItems
- feedId
- pubDate
- id (guid)
- title
- description
- link
- guid

FeedItemReads
- userId
- feedItemId
- read
