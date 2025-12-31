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
    /** 自定义样式类 */
    className?: string;
  }

  /**
   * Context menu target types
   */
  export type ContextTarget =
    | { type: 'node'; id: string }
    | { type: 'edge'; id: string }
    | { type: 'canvas'; position: { x: number; y: number } }
    | { type: 'subgraph'; id: string };

  /**
   * Create menu items for a node
   */
  export function createNodeMenuItems(
    _nodeId: string,
    options: { canConnect?: boolean; canEdit?: boolean } = {}
  ): MenuItem[] {
    const { canConnect = true, canEdit = true } = options;
    return [
      { id: 'edit-node', label: '编辑节点', icon: '✏️', shortcut: 'E', disabled: !canEdit },
      { id: 'duplicate-node', label: '复制节点', icon: '📋', shortcut: 'Ctrl+D' },
      { id: 'connect-from', label: '从此连接', icon: '🔗', disabled: !canConnect },
      { id: 'separator1', label: '', separator: true },
      { id: 'bring-front', label: '置于顶层', icon: '⬆️' },
      { id: 'send-back', label: '置于底层', icon: '⬇️' },
      { id: 'separator2', label: '', separator: true },
      { id: 'delete-node', label: '删除节点', icon: '🗑️', shortcut: 'Del', danger: true },
    ];
  }

  /**
   * Create menu items for an edge
   */
  export function createEdgeMenuItems(_edgeId: string): MenuItem[] {
    return [
      { id: 'edit-edge-text', label: '编辑文本', icon: '✏️' },
      {
        id: 'change-style',
        label: '更改样式',
        icon: '🎨',
        children: [
          { id: 'style-normal', label: '普通线' },
          { id: 'style-dotted', label: '虚线' },
          { id: 'style-thick', label: '粗线' },
        ],
      },
      {
        id: 'change-arrow',
        label: '更改箭头',
        icon: '➡️',
        children: [
          { id: 'arrow-end', label: '单向箭头 →' },
          { id: 'arrow-both', label: '双向箭头 ↔' },
          { id: 'arrow-none', label: '无箭头 —' },
          { id: 'arrow-circle', label: '圆形端点 ○' },
          { id: 'arrow-cross', label: '叉形端点 ✕' },
        ],
      },
      { id: 'separator1', label: '', separator: true },
      { id: 'delete-edge', label: '删除连接', icon: '🗑️', shortcut: 'Del', danger: true },
    ];
  }

  /**
   * Create menu items for canvas (empty area)
   */
  export function createCanvasMenuItems(): MenuItem[] {
    return [
      {
        id: 'add-node',
        label: '添加节点',
        icon: '➕',
        children: [
          { id: 'add-node-rect', label: '矩形' },
          { id: 'add-node-rounded', label: '圆角矩形' },
          { id: 'add-node-stadium', label: '胶囊形' },
          { id: 'add-node-circle', label: '圆形' },
          { id: 'add-node-diamond', label: '菱形' },
          { id: 'add-node-hexagon', label: '六边形' },
          { id: 'separator', label: '', separator: true },
          { id: 'add-node-doc', label: '文档' },
          { id: 'add-node-cylinder', label: '数据库' },
          { id: 'add-node-subroutine', label: '子程序' },
        ],
      },
      { id: 'paste', label: '粘贴', icon: '📋', shortcut: 'Ctrl+V', disabled: true },
      { id: 'separator1', label: '', separator: true },
      { id: 'select-all', label: '全选', icon: '☑️', shortcut: 'Ctrl+A' },
      { id: 'separator2', label: '', separator: true },
      { id: 'fit-view', label: '适应视图', icon: '🔍' },
      { id: 'reset-zoom', label: '重置缩放', icon: '🔄' },
    ];
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

    document.addEventListener('click', handleClickOutside);
    menuEl?.focus();

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleItemClick(item: MenuItem): void {
    if (item.disabled || item.separator) return;

    // 如果有子菜单,不触发选择
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

      // 如果右侧空间不足,在左侧显示
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
  tabindex="-1"
  onkeydown={handleKeyDown}
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
    background: var(--merfolk-panel, #ffffff);
    border: 1px solid var(--merfolk-border, #e0e0e0);
    border-radius: 6px;
    box-shadow: 0 4px 12px var(--merfolk-shadow, rgba(0, 0, 0, 0.15));
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
    background: var(--merfolk-button-hover, #f5f5f5);
  }

  .menu-item.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .menu-item.danger {
    color: var(--merfolk-danger, #d32f2f);
  }

  .menu-item.danger:hover:not(.disabled) {
    background: var(--merfolk-danger-soft, #ffebee);
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
    color: var(--merfolk-text-muted, #999);
    margin-left: 8px;
    flex-shrink: 0;
  }

  .submenu-arrow {
    font-size: 10px;
    color: var(--merfolk-text-muted, #999);
    margin-left: 4px;
    flex-shrink: 0;
  }

  .menu-separator {
    height: 1px;
    margin: 4px 8px;
    background: var(--merfolk-border, #e0e0e0);
  }

  /* 子菜单样式 */
  .submenu {
    position: fixed;
    z-index: 1001;
    min-width: 180px;
    padding: 4px 0;
    background: var(--merfolk-panel, #ffffff);
    border: 1px solid var(--merfolk-border, #e0e0e0);
    border-radius: 6px;
    box-shadow: 0 4px 12px var(--merfolk-shadow, rgba(0, 0, 0, 0.15));
    font-size: 13px;
  }
</style>
