<nav
  class="bg-stone-200 dark:bg-stone-800 dark:text-white border-b border-stone-300 dark:border-stone-700 w-full"
>
  <slot name="nav" />
</nav>

<aside
  class="top-0 left-0 z-40 w-80 h-screen mt-0 bg-stone-200 border-r border-stone-300 md:translate-x-0 dark:bg-stone-800 dark:border-stone-700 dark:text-white"
  aria-label="Sidenav"
>
  <slot name="sidebar" />
</aside>

<slot />
