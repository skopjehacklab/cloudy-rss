<script>
  import { liveQuery } from 'dexie'
  import { useDB } from '../../../database'
  import { page } from '$app/stores'
  import { get } from 'svelte/store'

  let db = useDB()

  let feedItems = liveQuery(async () => {
    let feedId = get(page).params.id
    console.log('Fetching for', feedId)
    let items = await db.feedItems.where('feedId').equals(feedId).reverse().limit(10).toArray()
    console.log('Found items', items)
    return items
  })
</script>

{#if $feedItems && $feedItems.length > 0}
  {#each $feedItems as item}
    <h2>{item.title}</h2>
    <div>
      {item.description}
    </div>
  {/each}
{:else}
  <p>No feed items found.</p>
{/if}
