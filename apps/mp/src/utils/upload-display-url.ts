/**
 * 上传结果转成小程序 <image> 能画出来的地址。
 * 后端常返回相对路径；不拼 origin 时微信会画空白，关掉面板再开（或保存后重进）才正常。
 */
export function resolveUploadDisplayUrl(
  remoteUrl: string | undefined,
  localPath: string,
  origin: string,
) {
  const raw = String(remoteUrl || '').trim();
  if (!raw) return localPath;
  if (
    /^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(raw) ||
    raw.startsWith('data:') ||
    raw.startsWith('wxfile:')
  ) {
    return raw;
  }
  const root = String(origin || '').replace(/\/+$/, '');
  if (!root) return localPath;
  return `${root}${raw.startsWith('/') ? raw : `/${raw}`}`;
}
