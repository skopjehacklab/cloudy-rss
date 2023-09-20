# tinier-rss

Serverless approximation of tiny-tiny-rss

Requirements
- Login with OIDC, frontend-only
- Allowlist for logins
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

  <title>Example entry</title>
  <description>Here is some text containing an interesting description.</description>
  <link>http://www.example.com/blog/post/1</link>
  <guid isPermaLink="false">7bd204c6-1655-4c27-aeee-53f933c5395f</guid>
  <pubDate>Sun, 6 Sep 2009 16:20:00 +0000</pubDate>


