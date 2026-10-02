import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';

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
import {
  openAttachmentViewer,
  useAttachmentViewer,
} from '#/components/attachment-viewer';

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
  const markingAllRead = shallowRef(false);
  const detailLoading = shallowRef(false);
  const downloadingAttachments = shallowRef<
    Array<{ index: number; mode: 'download' | 'preview'; uid: number }>
  >([]);
  const previewUrls = new Set<string>();
  const attachmentViewer = useAttachmentViewer();

  function revokePreviewUrls() {
    for (const url of previewUrls) URL.revokeObjectURL(url);
    previewUrls.clear();
  }

  watch(attachmentViewer.visible, (open) => {
    if (!open) revokePreviewUrls();
  });
  onScopeDispose(revokePreviewUrls);
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

  async function collectUnreadUids(folderName: string) {
    const uids: number[] = [];
    let pageIndex = 1;
    const pageSize = 100;
    while (uids.length < 5000) {
      const page = await getPersonalMailPagedList({
        folderName,
        pageIndex,
        pageSize,
        unreadOnly: true,
      });
      const rows = page.items || [];
      for (const row of rows) uids.push(row.uid);
      if (rows.length < pageSize) break;
      pageIndex += 1;
    }
    return uids;
  }

  async function markAllInboxRead() {
    const folderName = activeFolderName.value;
    if (!activeFolder.value?.isInbox || !folderName) return false;
    markingAllRead.value = true;
    try {
      const uids = await collectUnreadUids(folderName);
      if (uids.length === 0) {
        message.info('没有未读邮件');
        return false;
      }
      for (let offset = 0; offset < uids.length; offset += 500) {
        await setPersonalMailRead({
          folderName,
          isRead: true,
          uids: uids.slice(offset, offset + 500),
        });
      }
      if (detail.value && uids.includes(detail.value.uid)) {
        detail.value.isRead = true;
      }
      message.success('已全部标为已读');
      await loadFolders();
      const inbox = folders.value.find((item) => item.isInbox);
      if (inbox && (inbox.unreadCount == null || inbox.unreadCount < 0)) {
        inbox.unreadCount = 0;
      }
      await loadList();
      return true;
    } finally {
      markingAllRead.value = false;
    }
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

  const downloadingIndexes = computed(() => attachmentIndexes('download'));
  const previewingIndexes = computed(() => attachmentIndexes('preview'));

  function attachmentIndexes(mode: 'download' | 'preview') {
    const uid = detail.value?.uid;
    if (uid == null) return [];
    return downloadingAttachments.value
      .filter((item) => item.uid === uid && item.mode === mode)
      .map((item) => item.index);
  }

  async function runAttachmentJob(
    file: PersonalMailAdminApi.MailAttachmentSummary,
    mode: 'download' | 'preview',
    task: (blob: Blob) => void,
  ) {
    if (!detail.value) return;
    const uid = detail.value.uid;
    const folderName = detail.value.folderName || activeFolderName.value;
    if (
      downloadingAttachments.value.some(
        (item) => item.uid === uid && item.index === file.index,
      )
    ) {
      return;
    }
    const startedAt = Date.now();
    downloadingAttachments.value = [
      ...downloadingAttachments.value,
      { index: file.index, mode, uid },
    ];
    try {
      const blob = await downloadPersonalMailAttachment({
        attachmentIndex: file.index,
        folderName,
        uid,
      });
      task(blob);
    } catch (error) {
      const text = await readRequestErrorMessage(error);
      message.error(
        text || (mode === 'preview' ? '附件预览失败' : '附件下载失败'),
      );
    } finally {
      const remain = 500 - (Date.now() - startedAt);
      if (remain > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, remain);
        });
      }
      downloadingAttachments.value = downloadingAttachments.value.filter(
        (item) => !(item.uid === uid && item.index === file.index),
      );
    }
  }

  function downloadAttachment(
    file: PersonalMailAdminApi.MailAttachmentSummary,
  ) {
    return runAttachmentJob(file, 'download', (blob) => {
      downloadFileFromBlob({
        fileName: file.fileName || '附件',
        source: blob,
      });
    });
  }

  function previewAttachment(file: PersonalMailAdminApi.MailAttachmentSummary) {
    return runAttachmentJob(file, 'preview', (blob) => {
      const url = URL.createObjectURL(blob);
      previewUrls.add(url);
      const opened = openAttachmentViewer({
        fileName: file.fileName || '附件',
        fileUrl: url,
        title: file.fileName || '附件',
      });
      if (!opened) {
        URL.revokeObjectURL(url);
        previewUrls.delete(url);
      }
    });
  }

  return {
    accountMissing,
    actionUids,
    activeFolder,
    activeFolderName,
    activeUid,
    boot,
    booted,
    changePage,
    checkedUids,
    dateRange,
    detail,
    detailLoading,
    downloadAttachment,
    downloadingIndexes,
    previewAttachment,
    previewingIndexes,
    folderLoading,
    folders,
    items,
    keyword,
    listLoading,
    loadList,
    markAllInboxRead,
    markingAllRead,
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
