import { get, type Readable } from 'svelte/store'

export let waitUntilDefined = <T>(store: Readable<T>) => {
  let currentValue = get(store)
  if (currentValue) return Promise.resolve(currentValue)
  return new Promise<T>(resolve => {
    let unsubscribe = store.subscribe(value => {
      if (value) {
        resolve(value)
        unsubscribe()
      }
    })
  })
}
