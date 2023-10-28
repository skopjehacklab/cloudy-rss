import { writable, get, type Writable } from 'svelte/store'
import * as oidcClient from 'oidc-client-ts'
import { browser } from '$app/environment'
import type { IdTokenClaims } from 'oidc-client-ts'
import { getContext, setContext } from 'svelte'

type JWTUserInfo = {
  aud: string
  email: string
  email_verified: boolean
  exp: number
  family_name: string
  given_name: string
  iat: number
  iss: string
  locale: string
  name: string
  picture: string
  sub: string
}

export type AuthenticationState =
  | {
      state: 'LoggedOut' | 'Loading'
      authError?: string
      accessToken?: string
      idToken?: string
      userInfo?: JWTUserInfo
    }
  | {
      state: 'Authenticated'
      accessToken: string
      idToken?: string
      userInfo: JWTUserInfo
    }

function hasAuthParams(location = window.location): boolean {
  // response_mode: query
  let searchParams = new URLSearchParams(location.search)
  if ((searchParams.get('code') || searchParams.get('error')) && searchParams.get('state')) {
    return true
  }

  // response_mode: fragment
  searchParams = new URLSearchParams(location.hash.replace(/^#/, '?'))
  if (
    (searchParams.get('code') || searchParams.get('error') || searchParams.get('id_token')) &&
    searchParams.get('state')
  ) {
    return true
  }

  return false
}

class AuthStore {
  private userManager: oidcClient.UserManager
  public authState: Writable<AuthenticationState>

  constructor(options: oidcClient.UserManagerSettings) {
    this.userManager = new oidcClient.UserManager({
      ...options,
      userStore: new oidcClient.WebStorageStateStore({ store: window.localStorage })
    })
    this.authState = writable<AuthenticationState>({ state: 'Loading' })
    this.userManager.events.addUserLoaded(user => {
      this.authState.set({
        state: 'Authenticated',
        accessToken: user.access_token,
        idToken: user.id_token,
        userInfo: user.profile as JWTUserInfo
      })
    })
    this.userManager.events.addUserUnloaded(() => {
      this.authState.set({ state: 'LoggedOut' })
    })
    this.userManager.events.addSilentRenewError((e: Error) => {
      this.authState.set({
        ...get(this.authState),
        state: 'LoggedOut',
        authError: `SilentRenewError: ${e.message}`
      })
    })
  }
  private async refreshToken() {
    try {
      await this.userManager.signinSilent()
    } catch (e: unknown) {
      this.authState.set({
        ...get(this.authState),
        state: 'LoggedOut',
        authError: (e as Error).message ?? 'Unknown error'
      })
    }
  }

  async logout(returnTo: string = window.location.href) {
    return this.userManager.signoutRedirect({ post_logout_redirect_uri: returnTo })
  }
  async login(
    preserveRoute: boolean = true,
    redirect_uri: string = window.location.href.substring(
      0,
      window.location.href.indexOf(window.location.pathname)
    ) + '/'
  ) {
    // try to keep the user on the same page from which they triggered login. If set to false should typically
    // cause redirect to /.
    const appState = preserveRoute
      ? {
          pathname: window.location.pathname,
          search: window.location.search
        }
      : {}
    await this.userManager.signinRedirect({ redirect_uri, state: appState })
  }

  async handleOnMount() {
    let currentUser = await this.userManager.getUser()
    console.log(currentUser)
    if (currentUser) {
      this.authState.set({
        state: currentUser.expired ? 'LoggedOut' : 'Authenticated',
        accessToken: currentUser.access_token,
        idToken: currentUser.id_token,
        userInfo: currentUser.profile as JWTUserInfo
      })
    }
    try {
      if (hasAuthParams()) {
        this.authState.set({ state: 'Loading' })
        await this.userManager.signinCallback()
        let currentUser = await this.userManager.getUser()
        if (!currentUser) throw new Error('SigninCallback failed: no user')

        this.authState.set({
          state: 'Authenticated',
          accessToken: currentUser.access_token,
          idToken: currentUser.id_token,
          userInfo: currentUser.profile as JWTUserInfo
        })
        // clear auth params (code, id_token, access_token etc) from URL
        window.history.replaceState({}, '', window.location.pathname)
        return
      }
    } catch (e: unknown) {
      this.authState.set({
        ...get(this.authState),
        state: 'LoggedOut',
        authError: (e as Error).message ?? 'Unknown error'
      })
      return
    }
  }
  async handleOnDestroy() {
    // TODO: remove callbacks
  }
}

const AUTH_CONTEXT_KEY = 'clodyrss:auth'

export function createAuthContext(opts: oidcClient.UserManagerSettings) {
  let authStore = new AuthStore(opts)
  setContext(AUTH_CONTEXT_KEY, authStore)
  authStore.handleOnMount()
  return authStore
}

export function useAuth() {
  let auth = getContext<AuthStore>(AUTH_CONTEXT_KEY)
  return auth
}
