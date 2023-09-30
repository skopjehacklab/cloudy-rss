<script lang="ts">
  import '../app.postcss'
  import { AppBar, AppShell, LightSwitch, Modal } from '@skeletonlabs/skeleton'
  import { initializeStores } from '@skeletonlabs/skeleton'

  import Sidebar from '../components/sidebar.svelte'
  import { createAuthStore } from '../stores/auth'

  import { browser } from '$app/environment'
  initializeStores()

  let ApiUrl = import.meta.env.VITE_PUBLIC_API_URL

  let authStore = createAuthStore({
    authority: 'https://accounts.google.com',
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    scope: 'openid profile email',
    redirect_uri: `${browser ? window.location.origin : ''}`
    // silent_redirect_uri: `${browser ? window.location.host : ''}/silent-oidc.html`,
  })

  authStore.handleOnMount()
</script>

<Modal />

<AppShell slotSidebarLeft="bg-surface-100-800-token w-0 lg:w-64 p-3">
  <svelte:fragment slot="header">
    <AppBar padding="py-3 px-4">
      <svelte:fragment slot="lead">
        <button class="lg:hidden btn btn-sm mr-4">
          <svg viewBox="0 0 100 80" class="fill-token w-4 h-4">
            <rect width="100" height="20" />
            <rect y="30" width="100" height="20" />
            <rect y="60" width="100" height="20" />
          </svg>
        </button>
        <div class="flex items-center">
          <strong class="text-xl uppercase">Cloudy RSS</strong>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="trail">
        <button class="btn-icon" on:click={() => authStore.login()}> Login </button>
        <LightSwitch />
      </svelte:fragment>
    </AppBar>
  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    <Sidebar />
  </svelte:fragment>

  <slot />
</AppShell>
