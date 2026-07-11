<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { VBEN_DOC_URL, VBEN_GITHUB_URL } from '@vben/constants';
import { useWatermark } from '@vben/hooks';
import {
  BookOpenText,
  CircleHelp,
  createIconifyIcon,
  SvgGithubIcon,
} from '@vben/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { VbenIconButton } from '@vben-core/shadcn-ui';

import { Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';
import AnnouncementLoginModal from '#/views/system/announcement/components/announcement-login-modal.vue';
import { useAnnouncementLoginModal } from '#/views/system/announcement/use-announcement-login-modal';

import RouteContentSpinner from './route-content-spinner.vue';

const MeetingIcon = createIconifyIcon('fluent-color:video-24');

// 消息通知待接后端 API，暂以空列表占位（#0133 方案 C）
const notifications = ref<NotificationItem[]>([]);

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { modalOpen, pendingAnnouncements } = useAnnouncementLoginModal();
const announcementUserId = computed(() => userStore.userInfo?.userId || '');
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
  // {
  //   handler: () => {
  //     openWindow(VBEN_DOC_URL, {
  //       target: '_blank',
  //     });
  //   },
  //   icon: BookOpenText,
  //   text: $t('ui.widgets.document'),
  // },
  // {
  //   handler: () => {
  //     openWindow(VBEN_GITHUB_URL, {
  //       target: '_blank',
  //     });
  //   },
  //   icon: SvgGithubIcon,
  //   text: 'GitHub',
  // },
  // {
  //   handler: () => {
  //     openWindow(`${VBEN_GITHUB_URL}/issues`, {
  //       target: '_blank',
  //     });
  //   },
  //   icon: CircleHelp,
  //   text: $t('ui.widgets.qa'),
  // },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

const userEmail = computed(() => {
  return (
    userStore.userInfo?.emailAddress ||
    userStore.userInfo?.username ||
    '未设置邮箱'
  );
});

const MEETING_BASE_URL = 'https://test.jiayuebetter.com/index.html';
const MEETING_ROOM = '123456';
const MEETING_PASSWORD = 'jiayueruanjian';

function buildMeetingUrl() {
  const name =
    userStore.userInfo?.nickName ||
    userStore.userInfo?.realName ||
    userStore.userInfo?.username ||
    userStore.userInfo?.userName ||
    '';

  const params = new URLSearchParams({
    room: MEETING_ROOM,
    password: MEETING_PASSWORD,
    name,
  });

  return `${MEETING_BASE_URL}?${params.toString()}`;
}

function handleOpenMeeting() {
  const url = buildMeetingUrl();
  const meetingWindow = window.open(url, '_blank');
  if (meetingWindow) {
    meetingWindow.opener = null;
  }
}

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}
watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
  }),
  async ({ enable, content }) => {
    if (enable) {
      await updateWatermark({
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #header-right-49>
      <Tooltip title="在线会议" placement="bottom">
        <VbenIconButton
          class="my-0 mr-1 rounded-md sm:mr-2"
          @click="handleOpenMeeting"
        >
          <MeetingIcon class="size-5" />
        </VbenIconButton>
      </Tooltip>
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="userEmail"
        tag-text="Pro"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
      <AnnouncementLoginModal
        v-if="announcementUserId"
        v-model:open="modalOpen"
        :announcements="pendingAnnouncements"
        :user-id="announcementUserId"
      />
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
    <template #content-overlay>
      <RouteContentSpinner />
    </template>
  </BasicLayout>
</template>
