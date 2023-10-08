<nav
  class="bg-stone-200 dark:bg-stone-800 dark:text-white border-b border-stone-300 dark:border-stone-700 fixed left-0 right-0 top-0 z-50 w-full"
>
  <slot name="nav" />
</nav>

<aside
  class="fixed top-14 left-0 z-40 w-80 h-screen mt-0 bg-stone-200 border-r border-stone-300 md:translate-x-0 dark:bg-stone-800 dark:border-stone-700 dark:text-white"
  aria-label="Sidenav"
>
  <slot name="sidebar" />
</aside>

<div class="md:ml-80 h-auto pt-14">
  <slot />
</div>
