<script lang="ts">
  import { liveQuery } from 'dexie'
  import { useDB } from '../../../database'
  import { page } from '$app/stores'
  import FeedItemSummary from '../../../components/feed-item-summary.svelte'
  let db = useDB()

  $: feedItems = liveQuery(async () => {
    let feedId = $page.params.id
    return await db.listFeedItems(feedId)
  })
</script>

<div
  class="fixed top-14 right-0 left-80 overflow-y-auto h-screen scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-500 dark:scrollbar-track-gray-700"
>
  {#if $feedItems && $feedItems.length > 0}
    {#each $feedItems as item}
      <FeedItemSummary feedItem={item.data} feedItemRead={item.read} />
    {/each}
  {:else}
    <p>No feed items found.</p>
  {/if}
</div>
