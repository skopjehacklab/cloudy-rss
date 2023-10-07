<script lang="ts">
  import AddIcon from './icons/add-icon.svelte'

  import { useDB } from '../database'
  import { v4 as uuid } from 'uuid'
  import { useModal } from './modal/store'
  import { Avatar, Button, Spinner } from 'flowbite-svelte'

  let modal = useModal()

  let db = useDB()

  async function addFeed() {
    let value = await modal
      .open({
        title: 'Add Feed',
        body: 'Enter the URL of the feed you want to add.',
        inputPlaceholder: 'https://domain.com/feed.xml'
      })
      .catch(e => undefined)

    if (!value) return
    let v = value

    console.log('Value is', v)
    await db.addSubscription(v, 300)
  }

  function shortenUrl(url: string) {
    let u = new URL(url)
    return u.hostname
  }

  let subs = db.collections.userSubscriptions.query().observe()
</script>

<div class="flex justify-between items-center px-3 py-2">
  <h2 class="text-xl font-bold">Feeds</h2>
  <button
    class="rounded-md py-2 px-2 dark:text-gray-400 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
    on:click={addFeed}
  >
    <AddIcon />
  </button>
</div>
<hr class="border-stone-300 dark:border-stone-700" />
<nav class="list-nav">
  {#if $subs != null}
    <ul>
      {#each $subs as sub}
        {#if sub.relFeed?.url}
          <li class="flex items-center space-x-4">
            <img
              class="w-10 h-10 rounded-full"
              src="/docs/images/people/profile-picture-5.jpg"
              alt=""
            />
            <div class="font-medium dark:text-white">
              <div>Jese Leos</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">Joined in August 2014</div>
            </div>
            <a href={sub.relFeed?.url}>{sub.relFeed.title}</a>
          </li>
        {:else if sub.url}
          <li class="flex items-center space-x-4 p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Spinner size="6" />
            <p>{shortenUrl(sub.url)}</p>
          </li>
        {/if}
      {/each}
    </ul>
  {/if}
</nav>
