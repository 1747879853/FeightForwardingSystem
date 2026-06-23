import type { AnnouncementAdminApi } from '#/api/system/announcement-admin';

import dayjs from 'dayjs';

export function isAnnouncementEffective(
  announcement: AnnouncementAdminApi.AnnouncementDto,
  now = dayjs(),
): boolean {
  if (!announcement.enable) {
    return false;
  }
  if (announcement.startTime && now.isBefore(dayjs(announcement.startTime))) {
    return false;
  }
  if (announcement.endTime && now.isAfter(dayjs(announcement.endTime))) {
    return false;
  }
  return true;
}

export function sortAnnouncements(
  list: AnnouncementAdminApi.AnnouncementDto[],
) {
  return [...list].sort((a, b) => {
    const sortDiff = (a.sortId ?? 0) - (b.sortId ?? 0);
    if (sortDiff !== 0) {
      return sortDiff;
    }
    return dayjs(b.creationTime).valueOf() - dayjs(a.creationTime).valueOf();
  });
}
