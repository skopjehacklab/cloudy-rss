<script lang="ts">
  import { liveQuery } from 'dexie'
  import { useDB } from '../../../database'
  import { page } from '$app/stores'
  import { get, writable } from 'svelte/store'
  import sanitizeHtml from 'sanitize-html'
  import type { FeedItem } from '@cloudy-rss/shared'

  let sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height']
    }
  }

  let db = useDB()

  $: pageId = get(page).params.id

  let s = writable([] as FeedItem[])

  $: feedItems = pageId
    ? liveQuery(async () => {
        let feedId = pageId
        console.log('Fetching for', feedId)
        let items = await db.feedItems.where('feedId').equals(feedId).reverse().limit(10).toArray()
        console.log('Found items', items)
        return items
      })
    : s
</script>

<article
  class="prose prose-stone dark:prose-invert mt-5 ml-4 mr-4 lg:prose-lg lg:mt-10 lg:ml-8 lg:mr-8"
>
  {#if $feedItems && $feedItems.length > 0}
    {#each $feedItems as item}
      <h2>{item.title}</h2>
      <div>
        {@html item.content
          ? sanitizeHtml(item.content, sanitizeOptions)
          : sanitizeHtml(item.description, sanitizeOptions)}
      </div>
    {/each}
  {:else}
    <p>No feed items found.</p>
  {/if}
</article>
