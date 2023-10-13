/// <reference types="@sveltejs/kit" />
/// <reference types="@types/serviceworker" />

import { build, files, version } from '$service-worker'

// Create a unique cache name for this deployment
const CACHE_PREFIX = `assets`
const CACHE = `${CACHE_PREFIX}-${version}`

const ASSETS = [
  ...build, // the app itself
  ...files // everything in `static`
]

self.addEventListener('install', (event: ExtendableEvent) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE)
    await cache.addAll(ASSETS)
  }

  event.waitUntil(addFilesToCache())
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key)
    }
  }

  event.waitUntil(deleteOldCaches())
})

self.addEventListener('fetch', (event: FetchEvent) => {
  // ignore POST requests etc
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Do not cache API sync requests
  if (url.origin === location.origin && url.pathname.startsWith('/api/sync')) {
    return
  }
  async function respond() {
    const cache = await caches.open(CACHE)

    // `build`/`files` can always be served from the cache
    if (url.origin === location.origin && ASSETS.includes(url.pathname)) {
      return (await cache.match(url.pathname))!
    }

    // for everything else, try the network first, but
    // fall back to the cache if we're offline
    try {
      const response = await fetch(event.request)

      if (response.status === 200) {
        cache.put(event.request, response.clone())
      }

      return response
    } catch {
      let cacheFallback = await cache.match(event.request)
      return cacheFallback!
    }
  }

  event.respondWith(respond())
})
