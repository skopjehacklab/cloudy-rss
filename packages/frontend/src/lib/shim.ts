interface Array<T> {
  group<U>(f: (t: T) => U): Array<[U, T[]]>
}

Array.prototype.group = function <T, U>(this: Array<T>, f: (t: T) => U): Array<[U, T[]]> {
  let groups = new Map<U, T[]>()
  for (let item of this) {
    let value = f(item)
    let group = groups.get(value)
    if (!group) {
      group = []
      groups.set(value, group)
    }
    group.push(item)
  }
  return Array.from(groups.entries())
}
