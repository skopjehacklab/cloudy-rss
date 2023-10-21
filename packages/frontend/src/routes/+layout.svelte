<script lang="ts">
  import '../app.postcss'

  import Sidebar from '../components/sidebar.svelte'

  import { browser } from '$app/environment'
  import Appshell from '../components/appshell.svelte'
  import { createModalContext } from '../components/modal/store'
  import { createAuthContext } from '../stores/auth'

  import { UserCircleSolid } from 'flowbite-svelte-icons'

  import ModalRoot from '../components/modal/modal-root.svelte'
  import { Avatar, Button, DarkMode } from 'flowbite-svelte'
  import { derived } from 'svelte/store'
  import { createDBContext } from '../database'

  let ApiUrl = import.meta.env.VITE_PUBLIC_API_URL

  createModalContext()

  let authStore = createAuthContext({
    authority: 'https://accounts.google.com',
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
    scope: 'openid profile email',
    redirect_uri: `${browser ? window.location.origin : ''}`
    // silent_redirect_uri: `${browser ? window.location.host : ''}/silent-oidc.html`
  })

  authStore.handleOnMount()

  let authState = authStore.authState

  let _db = createDBContext({
    autoSyncInterval: 90 * 1000,
    apiUrl: ApiUrl,
    token: derived(authState, as => as.idToken)
  })

  $: console.log('Auth state', authState)
</script>

<ModalRoot />
<Appshell>
  <div slot="nav" class="w-full py-2 px-3 flex flex-row justify-between">
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
    <div class="flex flex-row justify-end space-x-1">
      <DarkMode />
      {#if $authState.state === 'Authenticated'}
        <Avatar src={$authState.userInfo.picture} />
      {:else}
        <Button color="alternative" class="!p-2" size="xl" on:click={() => authStore.login()}>
          <UserCircleSolid class="w-4 h-4 text-stone-600 dark:text-stone-400" />
        </Button>
      {/if}
    </div>
  </div>
  <Sidebar slot="sidebar" />
  <slot />
</Appshell>
