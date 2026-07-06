/**
 * 通过隐藏链接触发文件下载。
 */
export function downloadFileByUrl(url: string, filename?: string) {
  if (!url) return;

  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.rel = 'noopener noreferrer';
  document.body.append(link);
  link.click();
  link.remove();
}
