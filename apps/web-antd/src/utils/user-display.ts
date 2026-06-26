import { getUser } from '#/api/system/user-admin';

/** 已删除用户的兜底展示名 */
export function formatDeletedUserFallback(userId: number): string {
  return `用户${userId}（已删除）`;
}

/** 按缓存名 / 用户详情解析展示名，均缺失时返回已删除兜底 */
export function resolveUserDisplayName(
  userId: number,
  cachedName?: string | null,
  detail?: { nickName?: string; userName?: string } | null,
): string {
  const normalizedCached = cachedName?.trim();
  if (normalizedCached && normalizedCached !== String(userId)) {
    return normalizedCached;
  }
  const nickName = detail?.nickName?.trim();
  if (nickName) return nickName;
  const userName = detail?.userName?.trim();
  if (userName) return userName;
  return formatDeletedUserFallback(userId);
}

/** 静默拉取用户并返回展示名，失败时返回已删除兜底 */
export async function fetchUserDisplayName(
  userId: number,
  cachedName?: string | null,
): Promise<string> {
  const normalizedCached = cachedName?.trim();
  if (normalizedCached && normalizedCached !== String(userId)) {
    return normalizedCached;
  }
  try {
    const detail = await getUser(userId, { silent: true });
    return resolveUserDisplayName(userId, cachedName, detail);
  } catch {
    return formatDeletedUserFallback(userId);
  }
}
