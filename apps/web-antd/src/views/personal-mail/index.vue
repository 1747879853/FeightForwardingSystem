<script setup lang="ts">
import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';
import type { ComposeSession } from '#/views/personal-mail/compose-session';

import {
  computed,
  onActivated,
  onMounted,
  onUnmounted,
  shallowRef,
  useTemplateRef,
} from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import { Button, Empty, message, Modal, Select } from 'ant-design-vue';

import {
  getPersonalMailDetail,
  PERSONAL_MAIL_PERMISSION,
} from '#/api/personal-mail/personal-mail-admin';
import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import {
  createDraftSession,
  createForwardSession,
  createNewMailSession,
  createReplySession,
} from '#/views/personal-mail/compose-session';
import { folderDisplayName } from '#/views/personal-mail/mail-format';

import MailCompose from './components/mail-compose.vue';
import MailFolderNav from './components/mail-folder-nav.vue';
import MailListPane from './components/mail-list-pane.vue';
import MailReadingPane from './components/mail-reading-pane.vue';
import { usePersonalMail } from './composables/use-personal-mail';

defineOptions({ name: 'PersonalMail' });

const router = useRouter();
const { hasAccessByCodes } = useAccess();
const mail = usePersonalMail();
const keyword = mail.keyword;
const unreadOnly = mail.unreadOnly;
const dateRange = mail.dateRange;
const shellRef = useTemplateRef<HTMLElement>('shellRef');

const canAccount = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.account]),
);
const canSend = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.send]),
);
const canReply = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.reply]),
);
const canForward = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.forward]),
);
const canDraft = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.draft]),
);
const canSetRead = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.setRead]),
);
const canMove = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.move]),
);
const canDelete = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.delete]),
);
const canDownload = computed(() =>
  hasAccessByCodes([PERSONAL_MAIL_PERMISSION.download]),
);

const composeRef = useTemplateRef<{ saveDraft: () => Promise<boolean> }>(
  'composeRef',
);
const composeSession = shallowRef<ComposeSession | null>(null);
const composeDirty = shallowRef(false);
const narrow = shallowRef(false);
const deleteOpen = shallowRef(false);
const moveOpen = shallowRef(false);
const moveTarget = shallowRef<string | undefined>();
const openingDraft = shallowRef(false);

const showReading = computed(() => !narrow.value || mail.narrowReading.value);
const showList = computed(() => !narrow.value || !mail.narrowReading.value);

const moveOptions = computed(() =>
  mail.folders.value
    .filter(
      (item) => item.fullName && item.fullName !== mail.activeFolderName.value,
    )
    .map((item) => ({
      label: folderDisplayName(item),
      value: item.fullName || '',
    })),
);

useUnsavedGuard({
  content: '邮件还没有发送，确定离开吗？',
  enabled: () => Boolean(composeSession.value),
  isDirty: () => composeDirty.value,
  title: '离开个人邮箱',
});

function goConfigure() {
  router.push({ path: '/profile', query: { tab: 'mail' } });
}

function closeCompose() {
  if (!composeDirty.value) {
    composeSession.value = null;
    return;
  }
  Modal.confirm({
    title: '丢弃邮件',
    content: '这封邮件还没有发送，确定关闭吗？',
    okText: '丢弃',
    cancelText: '继续编辑',
    onOk() {
      composeDirty.value = false;
      composeSession.value = null;
    },
  });
}

function finishCompose() {
  composeDirty.value = false;
  composeSession.value = null;
  mail.refreshOnActivate();
}

async function openDraft(summary: PersonalMailAdminApi.MailSummary) {
  openingDraft.value = true;
  try {
    const detail = await getPersonalMailDetail({
      folderName: summary.folderName || mail.activeFolderName.value,
      markAsRead: false,
      uid: summary.uid,
    });
    composeSession.value = createDraftSession(detail);
    composeDirty.value = false;
  } finally {
    openingDraft.value = false;
  }
}

async function onOpenMail(summary: PersonalMailAdminApi.MailSummary) {
  if (mail.activeFolder.value?.isDrafts) {
    await openDraft(summary);
    return;
  }
  await mail.openMail(summary);
}

function openReply(replyAll: boolean) {
  if (!mail.detail.value) return;
  composeSession.value = createReplySession(mail.detail.value, replyAll);
  composeDirty.value = false;
}

function openForward() {
  if (!mail.detail.value) return;
  composeSession.value = createForwardSession(mail.detail.value);
  composeDirty.value = false;
}

function openNew() {
  composeSession.value = createNewMailSession();
  composeDirty.value = false;
}

async function onSelectFolder(fullName: string) {
  if (!composeSession.value) {
    await mail.selectFolder(fullName);
    return;
  }
  const folder = mail.folders.value.find((item) => item.fullName === fullName);
  const name = folder ? folderDisplayName(folder) : '该文件夹';
  if (!composeDirty.value) {
    composeSession.value = null;
    await mail.selectFolder(fullName);
    return;
  }
  Modal.confirm({
    title: '保存草稿',
    content: `正在写信，将自动保存到草稿箱，然后打开「${name}」。`,
    okText: '保存并切换',
    cancelText: '继续编辑',
    async onOk() {
      if (!canDraft.value) {
        message.warning('没有保存草稿的权限，请继续编辑或丢弃这封邮件');
        throw new Error('no-draft-permission');
      }
      const saved = await composeRef.value?.saveDraft();
      if (!saved) {
        throw new Error('draft-not-saved');
      }
      composeDirty.value = false;
      composeSession.value = null;
      await mail.selectFolder(fullName);
      await mail.refreshOnActivate();
    },
  });
}

async function confirmMove() {
  if (!moveTarget.value) return;
  await mail.moveTo(moveTarget.value);
  moveOpen.value = false;
  moveTarget.value = undefined;
}

async function runDelete(permanent: boolean) {
  const removed = await mail.removeMails(
    permanent || Boolean(mail.activeFolder.value?.isTrash),
  );
  if (removed) deleteOpen.value = false;
}

let shellObserver: ResizeObserver | undefined;

onMounted(() => {
  const shell = shellRef.value;
  if (shell) {
    shellObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width || 0;
      narrow.value = width > 0 && width < 1080;
    });
    shellObserver.observe(shell);
  }
  mail.boot();
});

onUnmounted(() => {
  shellObserver?.disconnect();
});

onActivated(() => {
  mail.refreshOnActivate();
});
</script>

<template>
  <Page auto-content-height content-class="!overflow-hidden !p-3">
    <div ref="shellRef" class="mail-page">
      <div v-if="mail.accountMissing.value" class="mail-page__empty">
        <Empty description="还没有配置个人邮箱，请先在个人中心配置">
          <Button v-if="canAccount" type="primary" @click="goConfigure">
            去配置
          </Button>
          <p v-else class="mail-page__hint">请联系管理员开通邮箱配置权限</p>
        </Empty>
      </div>
      <div v-else class="mail-shell" :class="{ 'is-narrow': narrow }">
        <MailFolderNav
          :active-full-name="mail.activeFolderName.value"
          :can-compose="canSend"
          :folders="mail.folders.value"
          :loading="mail.folderLoading.value"
          @compose="openNew"
          @select="onSelectFolder"
        />
        <MailCompose
          v-if="composeSession"
          ref="composeRef"
          v-model:dirty="composeDirty"
          class="mail-shell__compose"
          :can-draft="canDraft"
          :can-forward="canForward"
          :can-reply="canReply"
          :can-send="canSend"
          :session="composeSession"
          @close="closeCompose"
          @done="finishCompose"
        />
        <template v-else>
          <MailListPane
            v-show="showList"
            v-model:keyword="keyword"
            v-model:unread-only="unreadOnly"
            v-model:date-range="dateRange"
            :active-uid="mail.activeUid.value"
            :checked-uids="mail.checkedUids.value"
            :folder-title="
              mail.activeFolder.value
                ? folderDisplayName(mail.activeFolder.value)
                : ''
            "
            :items="mail.items.value"
            :loading="mail.listLoading.value || openingDraft"
            :page-index="mail.pageIndex.value"
            :page-size="mail.pageSize"
            :total="mail.total.value"
            @open="onOpenMail"
            @page-change="mail.changePage"
            @refresh="mail.loadList"
            @search="mail.search"
            @toggle-all="mail.toggleAll"
            @toggle-check="mail.toggleCheck"
          />
          <MailReadingPane
            v-show="showReading"
            :can-delete="canDelete"
            :can-download="canDownload"
            :can-forward="canForward"
            :can-move="canMove"
            :can-reply="canReply"
            :can-set-read="canSetRead"
            :detail="mail.detail.value"
            :downloading-indexes="mail.downloadingIndexes.value"
            :loading="mail.detailLoading.value"
            :show-back="narrow"
            @back="mail.narrowReading.value = false"
            @download="mail.downloadAttachment"
            @forward="openForward"
            @move="moveOpen = true"
            @remove="deleteOpen = true"
            @reply="openReply(false)"
            @reply-all="openReply(true)"
            @toggle-read="mail.markRead(!mail.detail.value?.isRead)"
          />
        </template>
      </div>
    </div>

    <Modal
      v-model:open="deleteOpen"
      :title="mail.activeFolder.value?.isTrash ? '彻底删除' : '删除邮件'"
      :footer="null"
    >
      <p class="mail-page__dialog">
        {{
          mail.activeFolder.value?.isTrash
            ? '这些邮件将彻底删除，且不可恢复。'
            : '默认移动到已删除。彻底删除后不可恢复。'
        }}
      </p>
      <div class="mail-page__dialog-actions">
        <Button @click="deleteOpen = false">取消</Button>
        <Button
          v-if="!mail.activeFolder.value?.isTrash"
          type="primary"
          @click="runDelete(false)"
        >
          移到已删除
        </Button>
        <Button danger @click="runDelete(true)">彻底删除</Button>
      </div>
    </Modal>

    <Modal
      v-model:open="moveOpen"
      title="移动到"
      ok-text="移动"
      @ok="confirmMove"
    >
      <Select
        v-model:value="moveTarget"
        class="mail-page__move"
        :options="moveOptions"
        placeholder="选择文件夹"
      />
    </Modal>
  </Page>
</template>

<style scoped>
.mail-page {
  height: 100%;
  min-height: 0;
}

.mail-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.mail-page__hint {
  margin: 8px 0 0;
  color: hsl(var(--muted-foreground));
}

.mail-shell {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  grid-template-columns: 220px 360px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.mail-shell.is-narrow {
  grid-template-columns: 200px minmax(0, 1fr);
}

.mail-shell__compose {
  grid-column: 2 / -1;
  min-width: 0;
  min-height: 0;
}

.mail-page__dialog {
  margin: 0 0 16px;
}

.mail-page__dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.mail-page__move {
  width: 100%;
}
</style>
