<script lang="ts">
  import AddIcon from './icons/add-icon.svelte'

  import { useDB } from '../database'
  import { v4 as uuid } from 'uuid'
  import { useModal } from './modal/store'
  import { Avatar, Button, Spinner } from 'flowbite-svelte'
  import { liveQuery } from 'dexie'

  import { page } from '$app/stores'
  import { get } from 'svelte/store'

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

  function initials(name: string) {
    return name
      .split(' ')
      .map(w => w[0].toUpperCase())
      .filter(l => l.match(/[A-Z]/))
      .slice(0, 3)
      .join('')
  }

  let subs = liveQuery(() => db.listSubscriptions())

  $: console.log($page.url.pathname)
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
      {#each $subs as item}
        {#if item.feed}
          <li
            class={$page.url.pathname.startsWith(`/feed/${item.feed.feedId}`)
              ? 'bg-gray-100 dark:bg-gray-700'
              : ''}
          >
            <a
              class="flex items-center space-x-4 p-3 hover:bg-gray-100 dark:hover:bg-gray-700"
              href="/feed/{item.feed.feedId}"
            >
              <Avatar class="bg-stone-100" src={item.feed.image?.url}
                >{initials(item.feed.title)}</Avatar
              >
              <div class="font-medium dark:text-white">
                <div class="text underline-offset-2 underline">{item.feed.title}</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {item.feed.description}
                </div>
              </div>
            </a>
          </li>
        {:else if item.sub.url}
          <li class="flex items-center space-x-4 p-3 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Spinner size="6" />
            <p>{shortenUrl(item.sub.url)}</p>
          </li>
        {/if}
      {/each}
    </ul>
  {/if}
</nav>
