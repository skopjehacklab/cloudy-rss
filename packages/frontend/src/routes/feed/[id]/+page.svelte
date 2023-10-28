<script lang="ts">
  import { page } from '$app/stores'
  import FeedItemList from '../../../components/feed-item-list.svelte'
</script>

<div
  class="fixed top-14 right-0 left-80 bottom-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-500 dark:scrollbar-track-gray-700"
>
  <FeedItemList feedId={$page.params.id} />
</div>
