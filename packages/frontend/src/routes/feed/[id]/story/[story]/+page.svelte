<script lang="ts">
  import { liveQuery } from 'dexie'
  import { useDB } from '../../../../../database'
  import { page } from '$app/stores'

  import FeedStory from '../../../../../components/feed-item-story.svelte'
  import { onMount } from 'svelte'
  import { useAuth } from '../../../../../stores/auth'
  import FeedItemList from '../../../../../components/feed-item-list.svelte'
  let db = useDB()

  $: selectedItem = liveQuery(async () => {
    let storyId = $page.params.story
    console.log('Story id', storyId)
    let item = await db.feedItems.get(storyId)
    console.log('Item', item)
    return item
  })

  $: if ($selectedItem) {
    db.markRead($selectedItem.guid)
  }
</script>

<div class="fixed top-14 right-0 left-80 bottom-0 flex flex-row">
  <div
    class="overflow-y-auto h-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-500 dark:scrollbar-track-gray-800
    hidden xl:block"
  >
    <FeedItemList feedId={$page.params.id} />
  </div>

  <div
    class="overflow-y-auto h-full flex-grow scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-500 dark:scrollbar-track-gray-800"
  >
    <FeedStory storyId={$page.params.story} />
  </div>
</div>
