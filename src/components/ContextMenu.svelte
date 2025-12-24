<script lang="ts">
  import { onMount } from 'svelte';

  export interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
  }

  interface Props {
    x: number;
    y: number;
    items: MenuItem[];
    onSelect: (itemId: string) => void;
    onClose: () => void;
  }

  let { x, y, items, onSelect, onClose }: Props = $props();

  let menuEl: HTMLDivElement;

  onMount(() => {
    // 确保菜单不超出视口
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 8;
      }
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 8;
      }
    }

    // 点击外部关闭菜单
    const handleClickOutside = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    };

    // 按 Escape 关闭菜单
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  function handleItemClick(item: MenuItem): void {
    if (item.disabled || item.separator) return;
    onSelect(item.id);
    onClose();
  }
</script>

<div
  class="context-menu"
  bind:this={menuEl}
  style="left: {x}px; top: {y}px;"
  role="menu"
>
  {#each items as item}
    {#if item.separator}
      <div class="menu-separator"></div>
    {:else}
      <button
        class="menu-item"
        class:disabled={item.disabled}
        class:danger={item.danger}
        onclick={() => handleItemClick(item)}
        disabled={item.disabled}
        role="menuitem"
      >
        {#if item.icon}
          <span class="menu-icon">{item.icon}</span>
        {/if}
        <span class="menu-label">{item.label}</span>
        {#if item.shortcut}
          <span class="menu-shortcut">{item.shortcut}</span>
        {/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    min-width: 180px;
    padding: 4px 0;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 13px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
    gap: 8px;
  }

  .menu-item:hover:not(.disabled) {
    background: #f5f5f5;
  }

  .menu-item.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .menu-item.danger {
    color: #d32f2f;
  }

  .menu-item.danger:hover:not(.disabled) {
    background: #ffebee;
  }

  .menu-icon {
    font-size: 14px;
    width: 18px;
    text-align: center;
  }

  .menu-label {
    flex: 1;
    color: inherit;
  }

  .menu-shortcut {
    font-size: 11px;
    color: #999;
    margin-left: 8px;
  }

  .menu-separator {
    height: 1px;
    margin: 4px 8px;
    background: #e0e0e0;
  }
</style>

