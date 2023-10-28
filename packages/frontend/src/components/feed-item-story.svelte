<script lang="ts">
  import { liveQuery } from 'dexie'
  import sanitizeHtml from 'sanitize-html'
  import { useDB } from '../database'

  export let storyId: string

  let sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height']
    }
  }

  let db = useDB()

  $: item = liveQuery(async () => {
    console.log('Story id', storyId)
    let item = await db.feedItems.get(storyId)
    console.log('Item', item)
    return item
  })

  $: if ($item) {
    db.markRead($item.guid)
  }
</script>

{#if $item}
  <article
    class="mx-auto prose prose-stone dark:prose-invert mt-4 ml-4 mr-4 lg:prose-lg lg:mt-4 lg:ml-8 lg:mr-8"
  >
    <h2>
      <a class="inline-block pr-2 xl:hidden no-underline" href={`/feed/${$item.feedId}`}>⮨</a>
      <a target="_blank" href={$item.link} class="no-underline">
        {$item.title} ⧉
      </a>
    </h2>
    <div>
      {@html $item.content
        ? sanitizeHtml($item.content, sanitizeOptions)
        : sanitizeHtml($item.description, sanitizeOptions)}
    </div>
  </article>
{:else}
  <p>No selected item found.</p>
{/if}
