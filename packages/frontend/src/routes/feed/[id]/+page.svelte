<script lang="ts">
  import { liveQuery } from 'dexie'
  import { useDB } from '../../../database'
  import { page, updated } from '$app/stores'
  import sanitizeHtml from 'sanitize-html'

  let sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height']
    }
  }

  let db = useDB()

  $: feedItems = liveQuery(async () => {
    let feedId = $page.params.id
    let items = await db.feedItems.where({ feedId }).reverse().limit(100).toArray()
    return items
  })
</script>

<article
  class="prose prose-stone dark:prose-invert mt-5 ml-4 mr-4 lg:prose-lg lg:mt-10 lg:ml-8 lg:mr-8"
>
  {#if $feedItems && $feedItems.length > 0}
    {#each $feedItems as item}
      <h2>
        <a href={item.link}>
          {item.title}
        </a>
      </h2>
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
