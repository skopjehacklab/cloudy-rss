<script lang="ts">
	import '../app.postcss';
	import { AppBar, AppShell, LightSwitch, Modal } from '@skeletonlabs/skeleton';
  import { initializeStores } from '@skeletonlabs/skeleton';

  initializeStores();

  import Sidebar from '../components/sidebar.svelte';

  let ApiUrl = import.meta.env.VITE_PUBLIC_API_URL;

</script>

<Modal />

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
        <LightSwitch />
      </svelte:fragment>

    </AppBar>

  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    <Sidebar />
  </svelte:fragment>

	<slot />
</AppShell>
