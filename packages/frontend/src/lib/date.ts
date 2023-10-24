export function timeAgo(dateText: string) {
  let date = new Date(dateText)
  let duration = Date.now() - date.getTime()
  let seconds = Math.floor(duration / 1000)
  // Show minutes if < 120m, hours if < 48h, days otherwise
  if (seconds < 120 * 60) {
    return Math.floor(seconds / 60) + ' minutes'
  } else if (seconds < 48 * 60 * 60) {
    return Math.floor(seconds / 60 / 60) + ' hours'
  } else {
    return Math.floor(seconds / 60 / 60 / 24) + ' days'
  }
}
