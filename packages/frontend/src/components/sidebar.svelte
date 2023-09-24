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
			response: value => {
				db.write(async () => {
					await m.userSubscriptions.create(us => {
						us.url = value.url
						us.requestedFrequency = 300
						us.feedId = uuid()
					})
				})
			}
		})
	}

	let subs = m.userSubscriptions.query().observe()
</script>

<nav class="list-nav">
	<!-- a feed menu heading on the left with a plus button on the far right -->
	<div class="flex justify-between items-center">
		<h2 class="text-xl font-bold">Feeds</h2>
		<button class="btn btn-icon" on:click={addFeed}>+</button>
	</div>
	<!-- a discrete colored separator below the heading -->
	<hr class="my-1 bg-surface-300-600-token" />
	<!-- <p class="font-bold text-xl">Feeds</p> -->
	{#if $subs != null}
		<ul>
			{#each $subs as sub}
				{#if sub.relFeed}
					<li><a href={sub.relFeed?.url}>{sub.relFeed.title}</a></li>
				{:else}
					<li>Waiting...</li>
				{/if}
			{/each}
		</ul>
	{/if}
</nav>
