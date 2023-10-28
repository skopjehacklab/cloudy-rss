<script lang="ts">
  import { liveQuery } from 'dexie'
  import { useDB } from '../database'
  import { page } from '$app/stores'
  import FeedItemSummary from './feed-item-summary.svelte'
  let db = useDB()
  export let feedId: string

  $: feedItems = liveQuery(async () => {
    return await db.listFeedItems(feedId)
  })
</script>

{#if $feedItems && $feedItems.length > 0}
  {#each $feedItems as item}
    <FeedItemSummary feedItem={item.data} feedItemRead={item.read} />
  {/each}
{:else}
  <p>No feed items found.</p>
{/if}
