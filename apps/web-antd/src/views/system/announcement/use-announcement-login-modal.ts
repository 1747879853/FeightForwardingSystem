import type { AnnouncementAdminApi } from '#/api/system/announcement-admin';

import { ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { useAccessStore, useUserStore } from '@vben/stores';

import { getMyInfoApi } from '#/api/core/user';
import { getAnnouncementPagedList } from '#/api/system/announcement-admin';
import { abpActionCode } from '#/router/abp-authority';
import {
  isAnnouncementSkipSession,
  isAnnouncementUnread,
} from '#/utils/announcement-read-storage';
import {
  isAnnouncementEffective,
  matchesAnnouncementOrganization,
  sortAnnouncements,
} from '#/utils/announcement-filter';

const ANNOUNCEMENT_GET_PERMISSION = abpActionCode('Admin.Announcement', 'Get');

export function useAnnouncementLoginModal() {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const { hasAccessByCodes } = useAccess();

  const modalOpen = ref(false);
  const pendingAnnouncements = ref<AnnouncementAdminApi.AnnouncementDto[]>([]);
  const checkedSessionKey = ref('');

  const resetState = () => {
    modalOpen.value = false;
    pendingAnnouncements.value = [];
  };

  const loadUnreadAnnouncements = async () => {
    if (!accessStore.isAccessChecked) {
      return;
    }

    const userId = userStore.userInfo?.userId;
    if (!userId) {
      return;
    }

    if (!hasAccessByCodes([ANNOUNCEMENT_GET_PERMISSION])) {
      return;
    }

    if (isAnnouncementSkipSession(userId)) {
      return;
    }

    const sessionKey = `${userId}:${accessStore.accessToken ?? ''}`;
    if (checkedSessionKey.value === sessionKey && modalOpen.value) {
      return;
    }

    try {
      const [listResult, myInfo] = await Promise.all([
        getAnnouncementPagedList({
          Enable: true,
          PageIndex: 1,
          PageSize: 500,
          Sorting: 'SortId ASC, CreationTime DESC',
        }),
        getMyInfoApi(),
      ]);

      const unread = sortAnnouncements(listResult.items ?? []).filter(
        (item) =>
          isAnnouncementEffective(item) &&
          matchesAnnouncementOrganization(
            item,
            myInfo.companyId,
            myInfo.departmentId,
          ) &&
          isAnnouncementUnread(userId, item.id, item.lastModificationTime),
      );

      checkedSessionKey.value = sessionKey;

      if (unread.length === 0) {
        modalOpen.value = false;
        pendingAnnouncements.value = [];
        return;
      }

      pendingAnnouncements.value = unread;
      modalOpen.value = true;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        return;
      }
      console.error('Failed to load announcements:', error);
    }
  };

  watch(
    () => [
      accessStore.isAccessChecked,
      userStore.userInfo?.userId,
      accessStore.accessToken,
    ],
    () => {
      void loadUnreadAnnouncements();
    },
    { immediate: true },
  );

  return {
    modalOpen,
    pendingAnnouncements,
    resetState,
    reload: loadUnreadAnnouncements,
  };
}
