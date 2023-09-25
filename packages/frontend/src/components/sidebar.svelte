<script lang="ts">
	import { db, m, UserSubscription } from '../model'
	import { v4 as uuid } from 'uuid'
	import { getModalStore } from '@skeletonlabs/skeleton'

	let modalStore = getModalStore()

	function addFeed() {
		modalStore.trigger({
			type: 'prompt',
			title: 'Add Feed',
			body: 'Enter the URL of the feed you want to add.',
			valueAttr: {
				name: 'url',
				type: 'url',
				placeholder: 'https://example.com/feed.xml'
			},
			response: async (value) => {
        if (!value) return;
				await db.write(async () => {
					await m.userSubscriptions.create(us => {
						us.url = value
						us.requestedFrequency = 300
						us.feedId = uuid()
					})
				})
			}
		})
	}

	let subs = m.userSubscriptions.query().observe()

</script>

<div class="flex justify-between items-center">
  <h2 class="text-xl font-bold">Feeds</h2>
  <button type="button" class="btn-icon btn-icon-md p-0" on:click={addFeed}>

    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="inline-block w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>

  </button>
</div>
<hr class="my-1 bg-surface-300-600-token" />
<nav class="list-nav">
	<!-- a feed menu heading on the left with a plus button on the far right -->

	<!-- a discrete colored separator below the heading -->

	<!-- <p class="font-bold text-xl">Feeds</p> -->
	{#if $subs != null}
		<ul>
			{#each $subs as sub}
				{#if sub.relFeed?.url}
					<li><a href={sub.relFeed?.url}>{sub.relFeed.title}</a></li>
				{:else}
					<li>Waiting for {sub.url} a {sub.requestedFrequency}</li>
				{/if}
			{/each}
		</ul>
	{/if}
</nav>
