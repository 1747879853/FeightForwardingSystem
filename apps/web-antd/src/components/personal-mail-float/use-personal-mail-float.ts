import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed, h, ref, shallowRef } from 'vue';

import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { useAccessStore } from '@vben/stores';

import { notification } from 'ant-design-vue';

import {
  getMyPersonalMailAccountList,
  getPersonalMailPagedList,
  PERSONAL_MAIL_PERMISSION,
} from '#/api/personal-mail/personal-mail-admin';

import {
  formatNewMailNoticeLines,
  normalizeReceivedMails,
} from './new-mail-notice';
import {
  startPersonalMailSignalr,
  stopPersonalMailSignalr,
} from './personal-mail-signalr';

const PREVIEW_SIZE = 5;

const ready = shallowRef(false);
const expanded = shallowRef(false);
const loadingPreview = shallowRef(false);
const accountName = shallowRef('');
const accountEmail = shallowRef('');
const inboxFolder = shallowRef('');
const inboxTotal = shallowRef<null | number>(null);
const inboxUnread = shallowRef<null | number>(null);
const previews = ref<PersonalMailAdminApi.MailSummary[]>([]);
const pollSerial = shallowRef(0);
const hasNewMail = shallowRef(false);

let started = false;
let onVisible: (() => void) | null = null;
let onReceived:
  | ((payload: PersonalMailAdminApi.PersonalMailReceived) => void)
  | null = null;

async function loadPreviews(unreadOnly: boolean) {
  loadingPreview.value = true;
  try {
    const page = await getPersonalMailPagedList(
      {
        folderName: inboxFolder.value || undefined,
        pageIndex: 1,
        pageSize: PREVIEW_SIZE,
        unreadOnly: unreadOnly || undefined,
      },
      { skipErrorMessage: true },
    );
    const items = page.items || [];
    previews.value = items;
    const folderName = items[0]?.folderName;
    if (folderName) inboxFolder.value = folderName;
  } catch {
    previews.value = [];
  } finally {
    loadingPreview.value = false;
  }
}

function rememberFolder(items: PersonalMailAdminApi.MailSummary[]) {
  const folderName = items.find((item) => item.folderName)?.folderName;
  if (folderName) inboxFolder.value = folderName;
}

function applyCount(value: null | number | undefined) {
  if (value == null || value < 0) return null;
  return value;
}

async function refreshSnapshot() {
  if (!accountEmail.value) {
    const hasAccount = await loadAccount();
    if (!hasAccount) return;
  }
  const unreadPage = await getPersonalMailPagedList(
    {
      pageIndex: 1,
      pageSize: PREVIEW_SIZE,
      unreadOnly: true,
    },
    { skipErrorMessage: true },
  );
  const latestPage = await getPersonalMailPagedList(
    {
      pageIndex: 1,
      pageSize: PREVIEW_SIZE,
    },
    { skipErrorMessage: true },
  );
  const unreadItems = unreadPage.items || [];
  const latestItems = latestPage.items || [];
  rememberFolder(latestItems.length > 0 ? latestItems : unreadItems);
  inboxUnread.value = applyCount(unreadPage.totalCount);
  inboxTotal.value = applyCount(latestPage.totalCount);
  if (!hasNewMail.value) {
    previews.value = (unreadItems.length > 0 ? unreadItems : latestItems).slice(
      0,
      PREVIEW_SIZE,
    );
  }
}

async function loadAccount() {
  const accounts = await getMyPersonalMailAccountList({
    skipErrorMessage: true,
  });
  const account = accounts?.[0];
  if (!account) {
    ready.value = false;
    accountName.value = '';
    accountEmail.value = '';
    return false;
  }
  const email = account.emailAddress?.trim() || '';
  const name = account.displayName?.trim() || '';
  accountEmail.value = email;
  accountName.value = name || email || '个人邮箱';
  ready.value = true;
  return true;
}

function stopMailWatch() {
  started = false;
  ready.value = false;
  expanded.value = false;
  accountName.value = '';
  accountEmail.value = '';
  inboxTotal.value = null;
  inboxUnread.value = null;
  previews.value = [];
  pollSerial.value = 0;
  hasNewMail.value = false;
  onReceived = null;
  void stopPersonalMailSignalr();
  if (onVisible) {
    document.removeEventListener('visibilitychange', onVisible);
    onVisible = null;
  }
}

export function usePersonalMailFloat() {
  const accessStore = useAccessStore();
  const router = useRouter();
  const { hasAccessByCodes } = useAccess();
  const canWatch = computed(
    () =>
      Boolean(accessStore.accessToken) &&
      hasAccessByCodes([PERSONAL_MAIL_PERMISSION.get]),
  );
  const unreadBadge = computed(() => {
    const count = inboxUnread.value;
    if (count == null || count <= 0) return '';
    return count > 99 ? '99+' : String(count);
  });

  function openReceivedMail(mail?: PersonalMailAdminApi.MailSummary) {
    const folder = mail?.folderName || inboxFolder.value;
    const uid = mail?.uid;
    if (!folder || uid == null) {
      void router.push({ name: 'PersonalMail' });
      return;
    }
    void router.push({
      name: 'PersonalMail',
      query: { folder, uid: String(uid) },
    });
  }

  function handleReceived(payload: PersonalMailAdminApi.PersonalMailReceived) {
    if (!canWatch.value) return;
    const mails = normalizeReceivedMails(payload);
    if (mails.length > 0) {
      previews.value = mails;
      rememberFolder(mails);
    }
    hasNewMail.value = true;
    expanded.value = true;
    const lines = formatNewMailNoticeLines(payload);
    if (lines.length > 0) {
      const key = `personal-mail-${Date.now()}`;
      notification.info({
        description: h(
          'div',
          lines.map((line) => h('p', { style: 'margin:0 0 4px' }, line)),
        ),
        duration: 8,
        key,
        message: '新邮件',
        onClick: () => {
          notification.close(key);
          openReceivedMail(mails[0]);
        },
      });
    }
    void (async () => {
      try {
        await refreshSnapshot();
      } catch {
        const added = payload.newCount ?? mails.length;
        if (inboxUnread.value != null && added > 0) {
          inboxUnread.value += added;
        }
      }
      pollSerial.value += 1;
    })();
  }

  async function startMailWatch() {
    if (started || !canWatch.value) return;
    started = true;
    onReceived = handleReceived;
    if (!onVisible) {
      onVisible = () => {
        if (document.hidden || accountEmail.value) return;
        void refreshSnapshot().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', onVisible);
    }
    startPersonalMailSignalr(
      accessStore.encryptedAccessToken || '',
      (payload) => onReceived?.(payload),
    );
    if (!document.hidden) {
      void refreshSnapshot().catch(() => undefined);
    }
  }

  async function openPanel() {
    expanded.value = true;
    if (previews.value.length > 0) return;
    await loadPreviews(true);
    if (previews.value.length === 0) await loadPreviews(false);
  }

  function togglePanel() {
    if (expanded.value) {
      expanded.value = false;
      return;
    }
    void openPanel();
  }

  return {
    accountEmail,
    accountName,
    canWatch,
    expanded,
    inboxTotal,
    hasNewMail,
    inboxUnread,
    loadingPreview,
    openPanel,
    pollSerial,
    previews,
    ready,
    startMailWatch,
    stopMailWatch,
    togglePanel,
    unreadBadge,
  };
}
