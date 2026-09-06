function copyTextWithExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return typeof document.execCommand === 'function'
      ? document.execCommand('copy')
      : false;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/** Clipboard API 在 HTTP / 无权限 / 页面失焦时会抛错，失败后回退 execCommand。 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 常见于非安全上下文、剪贴板权限拒绝，继续走 execCommand
  }

  return copyTextWithExecCommand(text);
}
