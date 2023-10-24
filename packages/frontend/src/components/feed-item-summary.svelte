<script lang="ts">
  import { timeAgo } from '$lib/date'
  import type { FeedItem, UserFeedItemRead } from '@cloudy-rss/shared'
  import sanitizeHtml from 'sanitize-html'

  export let feedItem: FeedItem
  export let feedItemRead: UserFeedItemRead | undefined
</script>

<div class="border-b-2 border-gray-200 dark:border-gray-800 flex flex-row p-1">
  <div class="pl-3 pt-3 pr-1">
    <div class="text-xs pt-1 pr-1 text-gray-600 dark:text-gray-400 flex-col">
      <div>
        {#if feedItemRead}
          ◯
        {:else}
          ⬤
        {/if}
      </div>
    </div>
  </div>
  <div class="p-2 flex-col prose prose-md dark:prose-invert">
    <h4 class="font-bold mb-0">
      {#if feedItem.content}
        <a
          href={`/feed/${feedItem.feedId}/story/${encodeURIComponent(feedItem.guid)}`}
          class="no-underline"
        >
          {feedItem.title}
        </a>
      {:else}
        <a target="_blank" href={feedItem.link} class="no-underline">
          ⧉ {feedItem.title}
        </a>
      {/if}
    </h4>
    <div class="text-sm text-gray-500 dark:text-gray-400 pt-0">
      {feedItem.author}
      {timeAgo(feedItem.pubDate)} ago
    </div>
    <div class="text-sm pt-2">
      {@html sanitizeHtml(feedItem.description)}
    </div>
  </div>
</div>
