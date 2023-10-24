<script lang="ts">
  import type { FeedItem } from '@cloudy-rss/shared'
  import sanitizeHtml from 'sanitize-html'

  export let feedItem: FeedItem

  let sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title', 'width', 'height']
    }
  }
</script>

<article
  class="mx-auto prose prose-stone dark:prose-invert mt-4 ml-4 mr-4 lg:prose-lg lg:mt-4 lg:ml-8 lg:mr-8"
>
  <h2>
    <a class="inline-block pr-2 xl:hidden no-underline" href={`/feed/${feedItem.feedId}`}>⮨</a>
    <a target="_blank" href={feedItem.link} class="no-underline">
      {feedItem.title} ⧉
    </a>
  </h2>
  <div>
    {@html feedItem.content
      ? sanitizeHtml(feedItem.content, sanitizeOptions)
      : sanitizeHtml(feedItem.description, sanitizeOptions)}
  </div>
</article>
