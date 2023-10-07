import { writable, get } from 'svelte/store'
import * as oidcClient from 'oidc-client-ts'
import { browser } from '$app/environment'
import type { IdTokenClaims } from 'oidc-client-ts'

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

/**
 * Store
 */
export function createAuthStore(settings: oidcClient.UserManagerSettings) {
  if (!browser) {
    return {
      authState: writable<AuthenticationState>({ state: 'LoggedOut' }),
      login: () => {},
      refreshToken: () => {},
      logout: () => {},
      handleOnMount: () => {}
    }
  }
  let authState = writable<AuthenticationState>({ state: 'Loading' })
  let userManager = new oidcClient.UserManager({
    ...settings,
    userStore: new oidcClient.WebStorageStateStore({ store: window.localStorage })
  })

  userManager.events.addUserLoaded(function (user) {
    authState.set({
      state: 'Authenticated',
      accessToken: user.access_token,
      idToken: user.id_token,
      userInfo: user.profile as JWTUserInfo
    })
  })

  userManager.events.addUserUnloaded(function () {
    authState.set({ state: 'LoggedOut' })
  })

  userManager.events.addSilentRenewError(function (e: Error) {
    authState.set({
      ...get(authState),
      state: 'LoggedOut',
      authError: `SilentRenewError: ${e.message}`
    })
  })

  async function refreshToken() {
    try {
      await userManager.signinSilent()
    } catch (e: unknown) {
      authState.set({
        ...get(authState),
        state: 'LoggedOut',
        authError: (e as Error).message ?? 'Unknown error'
      })
    }
  }

  async function logout(returnTo: string = window.location.href) {
    return userManager.signoutRedirect({ post_logout_redirect_uri: returnTo })
  }
  async function login(preserveRoute: boolean = true, redirect_uri: string = window.location.href) {
    // try to keep the user on the same page from which they triggered login. If set to false should typically
    // cause redirect to /.
    const appState = preserveRoute
      ? {
          pathname: window.location.pathname,
          search: window.location.search
        }
      : {}
    await userManager.signinRedirect({ redirect_uri, state: appState })
  }

  async function handleOnMount() {
    let currentUser = await userManager.getUser()
    if (currentUser && !currentUser.expired) {
      authState.set({
        state: 'Authenticated',
        accessToken: currentUser.access_token,
        idToken: currentUser.id_token,
        userInfo: currentUser.profile as JWTUserInfo
      })
    }
    try {
      if (hasAuthParams()) {
        authState.set({ state: 'Loading' })
        await userManager.signinCallback()
        let currentUser = await userManager.getUser()
        if (!currentUser) throw new Error('SigninCallback failed: no user')

        authState.set({
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
      authState.set({
        ...get(authState),
        state: 'LoggedOut',
        authError: (e as Error).message ?? 'Unknown error'
      })
      return
    }
  }
  async function handleOnDestroy() {
    // TODO: remove callbacks
  }

  return { authState, login, refreshToken, logout, handleOnMount, handleOnDestroy }
}
