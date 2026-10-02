import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed, ref, shallowRef } from 'vue';

import { useAccess } from '@vben/access';
import { useAccessStore } from '@vben/stores';

import {
  getMyPersonalMailAccountList,
  getPersonalMailPagedList,
  PERSONAL_MAIL_PERMISSION,
} from '#/api/personal-mail/personal-mail-admin';

const POLL_MS = 60_000;
const POLL_PAGE_SIZE = 20;

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
let polling = false;
let baselineReady = false;
let seenUids = new Set<number>();
let timer = 0;
let onVisible: (() => void) | null = null;

function clearTimer() {
  if (!timer) return;
  window.clearTimeout(timer);
  timer = 0;
}

function schedule() {
  clearTimer();
  timer = window.setTimeout(() => {
    void tick();
  }, POLL_MS);
}

async function loadPreviews(unreadOnly: boolean) {
  loadingPreview.value = true;
  try {
    const page = await getPersonalMailPagedList(
      {
        folderName: inboxFolder.value || undefined,
        pageIndex: 1,
        pageSize: 5,
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

function rememberUids(items: PersonalMailAdminApi.MailSummary[]) {
  for (const item of items) seenUids.add(item.uid);
}

function rememberFolder(items: PersonalMailAdminApi.MailSummary[]) {
  const folderName = items.find((item) => item.folderName)?.folderName;
  if (folderName) inboxFolder.value = folderName;
}

async function pollInbox() {
  const unreadPage = await getPersonalMailPagedList(
    {
      pageIndex: 1,
      pageSize: POLL_PAGE_SIZE,
      unreadOnly: true,
    },
    { skipErrorMessage: true },
  );
  const latestPage = await getPersonalMailPagedList(
    {
      pageIndex: 1,
      pageSize: POLL_PAGE_SIZE,
    },
    { skipErrorMessage: true },
  );
  const unreadItems = unreadPage.items || [];
  const latestItems = latestPage.items || [];
  rememberFolder(latestItems.length > 0 ? latestItems : unreadItems);
  const unreadTotal = unreadPage.totalCount;
  const latestTotal = latestPage.totalCount;
  inboxUnread.value =
    unreadTotal == null || unreadTotal < 0 ? null : unreadTotal;
  inboxTotal.value =
    latestTotal == null || latestTotal < 0 ? null : latestTotal;
  const fresh = baselineReady
    ? latestItems.filter((item) => !seenUids.has(item.uid))
    : [];
  rememberUids(latestItems);
  if (!baselineReady) {
    baselineReady = true;
    previews.value = (unreadItems.length > 0 ? unreadItems : latestItems).slice(
      0,
      5,
    );
    hasNewMail.value = false;
  } else if (fresh.length > 0) {
    previews.value = fresh.slice(0, 5);
    hasNewMail.value = true;
    expanded.value = true;
  } else {
    hasNewMail.value = false;
  }
  pollSerial.value += 1;
}

async function tick() {
  if (!started || polling || document.hidden) {
    if (started) schedule();
    return;
  }
  polling = true;
  try {
    if (!accountEmail.value) {
      const hasAccount = await loadAccount();
      if (!hasAccount) return;
    }
    await pollInbox();
  } catch {
    // 下一轮再试，避免邮箱服务短暂失败时把悬浮框收掉
  } finally {
    polling = false;
    if (started) schedule();
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
  baselineReady = false;
  seenUids = new Set();
  clearTimer();
  if (onVisible) {
    document.removeEventListener('visibilitychange', onVisible);
    onVisible = null;
  }
}

export function usePersonalMailFloat() {
  const accessStore = useAccessStore();
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

  async function startMailWatch() {
    if (started || !canWatch.value) return;
    started = true;
    if (!onVisible) {
      onVisible = () => {
        if (!document.hidden) void tick();
      };
      document.addEventListener('visibilitychange', onVisible);
    }
    void tick();
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
