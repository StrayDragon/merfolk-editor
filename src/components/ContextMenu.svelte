<script module lang="ts">
  export interface MenuItem {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    danger?: boolean;
    separator?: boolean;
    /** 子菜单项 */
    children?: MenuItem[];
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    x: number;
    y: number;
    items: MenuItem[];
    onSelect: (itemId: string) => void;
    onClose: () => void;
  }

  let { x, y, items, onSelect, onClose }: Props = $props();

  let menuEl: HTMLDivElement;
  let activeSubmenuId = $state<string | null>(null);
  let submenuPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });

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

    // 如果有子菜单，不触发选择
    if (item.children && item.children.length > 0) {
      return;
    }

    onSelect(item.id);
    onClose();
  }

  function handleItemMouseEnter(item: MenuItem, event: MouseEvent): void {
    if (item.children && item.children.length > 0 && !item.disabled) {
      activeSubmenuId = item.id;

      // 计算子菜单位置
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // 默认在右侧显示
      let subX = rect.right;
      let subY = rect.top;

      // 如果右侧空间不足，在左侧显示
      if (subX + 180 > viewportWidth) {
        subX = rect.left - 180;
      }

      submenuPosition = { x: subX, y: subY };
    } else {
      activeSubmenuId = null;
    }
  }

  function handleSubmenuSelect(itemId: string): void {
    onSelect(itemId);
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
      <!-- svelte-ignore a11y_mouse_events_have_key_events -->
      <button
        class="menu-item"
        class:disabled={item.disabled}
        class:danger={item.danger}
        class:has-submenu={item.children && item.children.length > 0}
        class:submenu-active={activeSubmenuId === item.id}
        onclick={() => handleItemClick(item)}
        onmouseenter={(e) => handleItemMouseEnter(item, e)}
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
        {#if item.children && item.children.length > 0}
          <span class="submenu-arrow">▶</span>
        {/if}
      </button>

      <!-- 子菜单 -->
      {#if activeSubmenuId === item.id && item.children && item.children.length > 0}
        <div
          class="submenu"
          style="left: {submenuPosition.x}px; top: {submenuPosition.y}px;"
          role="menu"
        >
          {#each item.children as child}
            {#if child.separator}
              <div class="menu-separator"></div>
            {:else}
              <button
                class="menu-item"
                class:disabled={child.disabled}
                class:danger={child.danger}
                onclick={() => handleSubmenuSelect(child.id)}
                disabled={child.disabled}
                role="menuitem"
              >
                {#if child.icon}
                  <span class="menu-icon">{child.icon}</span>
                {/if}
                <span class="menu-label">{child.label}</span>
                {#if child.shortcut}
                  <span class="menu-shortcut">{child.shortcut}</span>
                {/if}
              </button>
            {/if}
          {/each}
        </div>
      {/if}
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
    position: relative;
  }

  .menu-item:hover:not(.disabled),
  .menu-item.submenu-active:not(.disabled) {
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
    flex-shrink: 0;
  }

  .menu-label {
    flex: 1;
    color: inherit;
  }

  .menu-shortcut {
    font-size: 11px;
    color: #999;
    margin-left: 8px;
    flex-shrink: 0;
  }

  .submenu-arrow {
    font-size: 10px;
    color: #999;
    margin-left: 4px;
    flex-shrink: 0;
  }

  .menu-separator {
    height: 1px;
    margin: 4px 8px;
    background: #e0e0e0;
  }

  /* 子菜单样式 */
  .submenu {
    position: fixed;
    z-index: 1001;
    min-width: 180px;
    padding: 4px 0;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 13px;
  }
</style>
