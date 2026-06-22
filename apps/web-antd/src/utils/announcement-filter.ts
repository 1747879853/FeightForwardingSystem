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

export function matchesAnnouncementOrganization(
  announcement: AnnouncementAdminApi.AnnouncementDto,
  companyId?: number | null,
  departmentId?: number | null,
): boolean {
  const units = announcement.organizationUnits;
  if (!units || units.length === 0) {
    return true;
  }
  const ids = new Set(
    units
      .map((item) => item.id)
      .filter((id): id is number => id !== undefined && id !== null),
  );
  if (companyId && ids.has(Number(companyId))) {
    return true;
  }
  if (departmentId && ids.has(Number(departmentId))) {
    return true;
  }
  return false;
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
