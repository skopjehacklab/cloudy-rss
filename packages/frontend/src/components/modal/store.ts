import { getContext, setContext } from 'svelte'
import { writable, get } from 'svelte/store'

export type DialogButton = {
  text: string
  type: 'primary' | 'alternative'
  action: (value?: string) => void
}

export type DialogSettings = {
  title: string
  body: string
  inputPlaceholder: string | undefined
}

export type DialogSettingsInternal = DialogSettings & {
  buttons: DialogButton[]
}

type DialogState =
  | {
      open: false
    }
  | {
      open: true
      resolve: (value?: string) => void
      reject: (err: Error) => void
    }

const MODAL_STORE_KEY = 'cloudy:modal'

function createModalStore() {
  let dialogState = writable<DialogState>({
    open: false
  })
  let defaultButtons: DialogButton[] = [
    {
      text: 'OK',
      type: 'primary',
      action: (input?: string) => {
        let d = get(dialogState)
        if (d.open) {
          dialogState.set({ open: false })
          d.resolve(input)
        }
      }
    },
    {
      text: 'Cancel',
      type: 'alternative',
      action: () => {
        let d = get(dialogState)
        if (d.open) {
          dialogState.set({ open: false })
          d.reject(new Error('Dialog closed'))
        }
      }
    }
  ]

  let dialogSettings = writable<DialogSettingsInternal>({
    title: 'Modal title',
    body: 'Modal body',
    inputPlaceholder: undefined,
    buttons: defaultButtons
  })

  function open(settings: DialogSettings) {
    return new Promise<string | undefined>((resolve, reject) => {
      dialogSettings.set({ ...settings, buttons: defaultButtons })
      dialogState.set({
        open: true,
        resolve,
        reject
      })
    })
  }

  function close() {
    let d = get(dialogState)
    if (d.open) {
      dialogState.set({ open: false })
      d.reject(new Error('Dialog closed'))
    }
  }
  return { open, close, dialogState, dialogSettings }
}

export function createModalContext() {
  let modalStore = createModalStore()
  setContext(MODAL_STORE_KEY, modalStore)
}

export function getFullModalContext() {
  return getContext<ReturnType<typeof createModalStore>>(MODAL_STORE_KEY)
}

export function useModal() {
  let { open, close } = getFullModalContext()
  return { open, close }
}
