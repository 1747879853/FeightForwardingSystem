import type { MaybeRefOrGetter } from 'vue';

import { onMounted, onUnmounted, ref, toValue } from 'vue';

/** 从粘贴事件取出文件。截图往往没有文件名，补成 png/jpg。 */
export function filesFromClipboard(event: ClipboardEvent): File[] {
  const data = event.clipboardData;
  if (!data) return [];
  const named = Array.from(data.files ?? []);
  const fromItems =
    named.length > 0
      ? named
      : Array.from(data.items ?? [])
          .filter((item) => item.kind === 'file')
          .map((item) => item.getAsFile())
          .filter((file): file is File => !!file);

  return fromItems.map((file, index) => {
    if (file.name) return file;
    const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
    return new File([file], `screenshot-${Date.now()}-${index}.${ext}`, {
      type: file.type || 'image/png',
    });
  });
}

function isTextEditingPasteTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  const field = el?.closest?.(
    'input, textarea, [contenteditable="true"]',
  ) as HTMLInputElement | null;
  if (!field) return false;
  if (field.tagName === 'INPUT' && field.type === 'file') return false;
  return true;
}

/**
 * 鼠标停在某个上传区域时，Ctrl+V 把剪贴板文件交给 onPaste。
 * zoneId 由调用方区分卡片；未悬停时不抢页面里其他输入框的粘贴。
 */
export function useAttachmentZonePaste(options: {
  enabled?: MaybeRefOrGetter<boolean>;
  onPaste: (zoneId: string, files: File[]) => void | Promise<void>;
}) {
  const hoverZoneId = ref<string | undefined>(undefined);

  function onZoneEnter(zoneId: string) {
    if (options.enabled !== undefined && !toValue(options.enabled)) return;
    hoverZoneId.value = zoneId;
  }

  function onZoneLeave(zoneId: string) {
    if (hoverZoneId.value === zoneId) {
      hoverZoneId.value = undefined;
    }
  }

  async function onWindowPaste(event: ClipboardEvent) {
    if (options.enabled !== undefined && !toValue(options.enabled)) return;
    if (hoverZoneId.value === undefined) return;
    if (isTextEditingPasteTarget(event.target)) return;
    const files = filesFromClipboard(event);
    if (files.length === 0) return;
    event.preventDefault();
    await options.onPaste(hoverZoneId.value, files);
  }

  onMounted(() => {
    window.addEventListener('paste', onWindowPaste);
  });

  onUnmounted(() => {
    window.removeEventListener('paste', onWindowPaste);
  });

  return { onZoneEnter, onZoneLeave };
}
