<script lang="ts">
	import '../app.postcss';
  import {m} from '../model';

	import { AppBar, AppShell } from '@skeletonlabs/skeleton';
  let ApiUrl = import.meta.env.VITE_PUBLIC_API_URL;

  let feeds = m.feeds.query().observe()
</script>

<AppShell slotSidebarLeft="bg-surface-100-800-token w-0 lg:w-64 p-3">
  <svelte:fragment slot="header">
    <AppBar padding="py-3 px-4">
      <svelte:fragment slot="lead">

      <button class="lg:hidden btn btn-sm mr-4">
        <span>
            <svg viewBox="0 0 100 80" class="fill-token w-4 h-4">
                <rect width="100" height="20" />
                <rect y="30" width="100" height="20" />
                <rect y="60" width="100" height="20" />
            </svg>
        </span>
      </button>
      <div class="flex items-center">

        <strong class="text-xl uppercase">Cloudy RSS</strong>
      </div>

      </svelte:fragment>

	    <svelte:fragment slot="trail">
        action buttons

      </svelte:fragment>

    </AppBar>

  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    <!-- Insert the list: -->
    <nav class="list-nav">
      <ul>
        {#each $feeds as feed}
          <li><a href={feed.url}>{feed.title}</a></li>
        {/each}
      </ul>
    </nav>
    <!-- --- -->
  </svelte:fragment>

	<slot />
</AppShell>
