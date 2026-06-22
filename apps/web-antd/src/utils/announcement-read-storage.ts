export type AnnouncementReadMap = Record<string, string>;

function getReadStorageKey(userId: string | number) {
  return `announcement:read:${userId}`;
}

export function getSkipSessionKey(userId: string | number) {
  return `announcement:skip-session:${userId}`;
}

export function loadAnnouncementReadMap(
  userId: string | number,
): AnnouncementReadMap {
  try {
    const raw = localStorage.getItem(getReadStorageKey(userId));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as AnnouncementReadMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function markAnnouncementAsRead(
  userId: string | number,
  announcementId: string | number,
  readAt = new Date().toISOString(),
) {
  const map = loadAnnouncementReadMap(userId);
  map[String(announcementId)] = readAt;
  localStorage.setItem(getReadStorageKey(userId), JSON.stringify(map));
}

export function isAnnouncementUnread(
  userId: string | number,
  announcementId: string | number,
  lastModificationTime?: string | null,
): boolean {
  const readAt = loadAnnouncementReadMap(userId)[String(announcementId)];
  if (!readAt) {
    return true;
  }
  if (!lastModificationTime) {
    return false;
  }
  return new Date(lastModificationTime).getTime() > new Date(readAt).getTime();
}

export function setAnnouncementSkipSession(userId: string | number) {
  sessionStorage.setItem(getSkipSessionKey(userId), '1');
}

export function isAnnouncementSkipSession(userId: string | number) {
  return sessionStorage.getItem(getSkipSessionKey(userId)) === '1';
}
