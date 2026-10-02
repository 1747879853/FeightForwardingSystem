import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed, ref, shallowRef } from 'vue';

import { downloadFileFromBlob } from '@vben/utils';
import { message } from 'ant-design-vue';

import {
  deletePersonalMail,
  downloadPersonalMailAttachment,
  getPersonalMailDetail,
  getPersonalMailFolderList,
  getPersonalMailPagedList,
  movePersonalMail,
  readRequestErrorMessage,
  setPersonalMailRead,
} from '#/api/personal-mail/personal-mail-admin';

const PAGE_SIZE = 20;
const MISSING_ACCOUNT = '还没有配置个人邮箱';

export function usePersonalMail() {
  const folders = ref<PersonalMailAdminApi.MailFolderSummary[]>([]);
  const items = ref<PersonalMailAdminApi.MailSummary[]>([]);
  const detail = ref<null | PersonalMailAdminApi.MailDetail>(null);
  const activeFolderName = shallowRef('');
  const keyword = shallowRef('');
  const unreadOnly = shallowRef(false);
  const dateRange = shallowRef<[string, string] | undefined>();
  const pageIndex = shallowRef(1);
  const total = shallowRef(0);
  const checkedUids = shallowRef<number[]>([]);
  const activeUid = shallowRef<null | number>(null);
  const folderLoading = shallowRef(false);
  const listLoading = shallowRef(false);
  const detailLoading = shallowRef(false);
  const accountMissing = shallowRef(false);
  const booted = shallowRef(false);
  const narrowReading = shallowRef(false);

  const activeFolder = computed(
    () =>
      folders.value.find((item) => item.fullName === activeFolderName.value) ??
      null,
  );

  const actionUids = computed(() => {
    if (checkedUids.value.length > 0) return checkedUids.value;
    return activeUid.value == null ? [] : [activeUid.value];
  });

  function clearReading() {
    activeUid.value = null;
    detail.value = null;
    narrowReading.value = false;
  }

  async function loadFolders() {
    folderLoading.value = true;
    try {
      const list = await getPersonalMailFolderList();
      folders.value = list || [];
      accountMissing.value = false;
      const stillThere = folders.value.some(
        (item) => item.fullName === activeFolderName.value,
      );
      if (!stillThere) {
        const inbox =
          folders.value.find((item) => item.isInbox) ?? folders.value[0];
        activeFolderName.value = inbox?.fullName || '';
        clearReading();
      }
    } catch (error) {
      const text = await readRequestErrorMessage(error);
      if (text.includes(MISSING_ACCOUNT)) {
        accountMissing.value = true;
        folders.value = [];
        items.value = [];
        clearReading();
        return;
      }
      message.error(text || '文件夹加载失败');
    } finally {
      folderLoading.value = false;
    }
  }

  async function loadList() {
    if (!activeFolderName.value || accountMissing.value) {
      items.value = [];
      total.value = 0;
      return;
    }
    listLoading.value = true;
    try {
      const [start, end] = dateRange.value ?? [];
      const page = await getPersonalMailPagedList({
        endDate: end ? `${end}T23:59:59` : undefined,
        folderName: activeFolderName.value,
        keyword: keyword.value.trim() || undefined,
        pageIndex: pageIndex.value,
        pageSize: PAGE_SIZE,
        startDate: start ? `${start}T00:00:00` : undefined,
        unreadOnly: unreadOnly.value || undefined,
      });
      items.value = page.items || [];
      total.value = page.totalCount || 0;
      checkedUids.value = checkedUids.value.filter((uid) =>
        items.value.some((item) => item.uid === uid),
      );
    } finally {
      listLoading.value = false;
    }
  }

  async function boot() {
    await loadFolders();
    await loadList();
    booted.value = true;
  }

  async function refreshOnActivate() {
    if (!booted.value) return;
    await loadFolders();
    await loadList();
  }

  async function selectFolder(fullName: string) {
    activeFolderName.value = fullName;
    pageIndex.value = 1;
    checkedUids.value = [];
    clearReading();
    await loadList();
  }

  async function search() {
    pageIndex.value = 1;
    await loadList();
  }

  async function changePage(page: number) {
    pageIndex.value = page;
    await loadList();
  }

  async function openMail(summary: PersonalMailAdminApi.MailSummary) {
    activeUid.value = summary.uid;
    narrowReading.value = true;
    detailLoading.value = true;
    try {
      const data = await getPersonalMailDetail({
        folderName: summary.folderName || activeFolderName.value,
        markAsRead: !activeFolder.value?.isDrafts,
        uid: summary.uid,
      });
      detail.value = data;
      const row = items.value.find((item) => item.uid === summary.uid);
      if (row && data.isRead && !row.isRead) {
        row.isRead = true;
        const folder = activeFolder.value;
        if (folder && (folder.unreadCount || 0) > 0) {
          folder.unreadCount = (folder.unreadCount || 0) - 1;
        }
      }
    } finally {
      detailLoading.value = false;
    }
  }

  function toggleCheck(uid: number, checked: boolean) {
    checkedUids.value = checked
      ? [...checkedUids.value, uid]
      : checkedUids.value.filter((item) => item !== uid);
  }

  function toggleAll(checked: boolean) {
    const pageUids = items.value.map((item) => item.uid);
    checkedUids.value = checked
      ? [...new Set([...checkedUids.value, ...pageUids])]
      : checkedUids.value.filter((uid) => !pageUids.includes(uid));
  }

  async function markRead(isRead: boolean) {
    const uids = actionUids.value;
    if (uids.length === 0) {
      message.warning('请先选择邮件');
      return;
    }
    await setPersonalMailRead({
      folderName: activeFolderName.value,
      isRead,
      uids,
    });
    message.success(isRead ? '已标为已读' : '已标为未读');
    if (detail.value && uids.includes(detail.value.uid)) {
      detail.value.isRead = isRead;
    }
    await loadFolders();
    await loadList();
  }

  async function moveTo(targetFolderName: string) {
    const uids = actionUids.value;
    if (uids.length === 0) {
      message.warning('请先选择邮件');
      return;
    }
    await movePersonalMail({
      folderName: activeFolderName.value,
      targetFolderName,
      uids,
    });
    message.success('邮件已移动');
    checkedUids.value = [];
    if (activeUid.value != null && uids.includes(activeUid.value)) {
      clearReading();
    }
    await loadFolders();
    await loadList();
  }

  async function removeMails(permanent: boolean) {
    const uids = actionUids.value;
    if (uids.length === 0) {
      message.warning('请先选择邮件');
      return false;
    }
    await deletePersonalMail({
      folderName: activeFolderName.value,
      permanent,
      uids,
    });
    message.success(permanent ? '邮件已彻底删除' : '邮件已移到已删除');
    checkedUids.value = [];
    if (activeUid.value != null && uids.includes(activeUid.value)) {
      clearReading();
    }
    await loadFolders();
    await loadList();
    return true;
  }

  async function downloadAttachment(
    file: PersonalMailAdminApi.MailAttachmentSummary,
  ) {
    if (!detail.value) return;
    try {
      const blob = await downloadPersonalMailAttachment({
        attachmentIndex: file.index,
        folderName: detail.value.folderName || activeFolderName.value,
        uid: detail.value.uid,
      });
      downloadFileFromBlob({
        fileName: file.fileName || '附件',
        source: blob,
      });
    } catch (error) {
      const text = await readRequestErrorMessage(error);
      message.error(text || '附件下载失败');
    }
  }

  return {
    accountMissing,
    actionUids,
    activeFolder,
    activeFolderName,
    activeUid,
    boot,
    changePage,
    checkedUids,
    dateRange,
    detail,
    detailLoading,
    downloadAttachment,
    folderLoading,
    folders,
    items,
    keyword,
    listLoading,
    loadList,
    markRead,
    moveTo,
    narrowReading,
    openMail,
    pageIndex,
    pageSize: PAGE_SIZE,
    refreshOnActivate,
    removeMails,
    search,
    selectFolder,
    toggleAll,
    toggleCheck,
    total,
    unreadOnly,
  };
}
