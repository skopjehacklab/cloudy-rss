export function enhanceError(msg: string) {
  return (e: Error) => {
    throw new Error(`${msg}: ${e}`)
  }
}
