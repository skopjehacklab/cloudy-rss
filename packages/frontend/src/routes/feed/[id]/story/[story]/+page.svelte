<script lang="ts">
  import { liveQuery } from 'dexie'
  import { useDB } from '../../../../../database'
  import { page, updated } from '$app/stores'
  import sanitizeHtml from 'sanitize-html'
  import FeedItemStory from '../../../../../components/feed-item-story.svelte'
  import FeedItemSummary from '../../../../../components/feed-item-summary.svelte'
  import { onMount } from 'svelte'
  import { useAuth } from '../../../../../stores/auth'
  let db = useDB()

  $: feedItems = liveQuery(async () => {
    let feedId = $page.params.id
    let items = await db.listFeedItems(feedId)
    return items
  })

  $: selectedItem = liveQuery(async () => {
    let storyId = $page.params.story
    console.log('Story id', storyId)
    let item = await db.feedItems.get(storyId)
    console.log('Item', item)
    return item
  })

  let auth = useAuth()

  let authState = auth.authState

  $: if ($selectedItem) {
    db.markRead($selectedItem.guid)
  }
</script>

<div class="fixed top-14 right-0 left-80 flex flex-row">
  <div
    class="w-4/12 overflow-y-auto h-screen scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-500 dark:scrollbar-track-gray-800
    hidden xl:block"
  >
    {#if $feedItems && $feedItems.length > 0}
      {#each $feedItems as item}
        <FeedItemSummary feedItem={item.data} feedItemRead={item.read} />
      {/each}
    {:else}
      <p>No feed items found.</p>
    {/if}
  </div>

  <div
    class="overflow-y-auto h-screen flex-grow scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-500 dark:scrollbar-track-gray-800"
  >
    {#if $selectedItem}
      <FeedItemStory feedItem={$selectedItem} />
    {:else}
      <p>No selected item found.</p>
    {/if}
  </div>
</div>
