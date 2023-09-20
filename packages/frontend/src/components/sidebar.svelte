<script lang="ts" context="module">
  export interface Category {
    name: string;
    link?: string;
    icon?: string;
    children?: Category[];
  };
</script>

<script lang="ts">
  export let categories: Category[]
</script>

<nav class="list-nav">
  <ul>
    {#each categories as category}
      <li><a href={category.link}>{category.name}</a></li>
    {/each}
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>