<script lang="ts">
  import { Button, Input, Modal } from 'flowbite-svelte'
  import { getFullModalContext } from './store'

  let ctx = getFullModalContext()
  let settings = ctx.dialogSettings
  let state = ctx.dialogState

  let inputValue = ''
</script>

<Modal title={$settings.title} open={$state.open} autoclose outsideclose>
  <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
    {$settings.body}
  </p>

  {#if $state.open && $settings.inputPlaceholder !== undefined}
    <Input autofocus placeholder={$settings.inputPlaceholder} bind:value={inputValue} />
  {/if}
  <svelte:fragment slot="footer">
    <!-- <div class="flex flex-row justify-start space-x-3 w-full"> -->
    {#each $settings.buttons as btn}
      <Button
        class="px-4 py-2 flex w-20"
        color={btn.type}
        on:click={() => {
          btn.action(inputValue)
        }}>{btn.text}</Button
      >
    {/each}
    <!-- </div> -->
  </svelte:fragment>
</Modal>
