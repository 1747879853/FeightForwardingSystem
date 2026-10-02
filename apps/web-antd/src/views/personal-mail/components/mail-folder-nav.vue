<script setup lang="ts">
import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { IconifyIcon } from '@vben/icons';

import { Button } from 'ant-design-vue';

import {
  folderCount,
  folderDisplayName,
} from '#/views/personal-mail/mail-format';

withDefaults(
  defineProps<{
    activeFullName?: string;
    accountEmail?: string;
    accountName?: string;
    canCompose?: boolean;
    folders: PersonalMailAdminApi.MailFolderSummary[];
    loading?: boolean;
  }>(),
  {
    accountEmail: '',
    accountName: '',
    activeFullName: '',
    canCompose: false,
    loading: false,
  },
);

const emit = defineEmits<{
  compose: [];
  select: [fullName: string];
}>();

function folderIcon(folder: PersonalMailAdminApi.MailFolderSummary) {
  if (folder.isInbox) return 'lucide:inbox';
  if (folder.isDrafts) return 'lucide:file-pen';
  if (folder.isSent) return 'lucide:send';
  if (folder.isTrash) return 'lucide:trash-2';
  if (folder.isJunk) return 'lucide:shield-alert';
  return 'lucide:folder';
}
</script>

<template>
  <aside class="mail-folders">
    <div v-if="accountName || accountEmail" class="mail-folders__account">
      <span class="mail-folders__account-name">
        {{ accountName || accountEmail }}
      </span>
      <span
        v-if="accountEmail && accountEmail !== accountName"
        class="mail-folders__account-mail"
      >
        {{ accountEmail }}
      </span>
    </div>
    <div class="mail-folders__compose">
      <Button v-if="canCompose" block type="primary" @click="emit('compose')">
        写邮件
      </Button>
    </div>
    <div class="mail-folders__list">
      <button
        v-for="(folder, index) in folders"
        :key="String(folder.fullName || folder.name || index)"
        type="button"
        class="mail-folders__item"
        :class="{ 'is-active': folder.fullName === activeFullName }"
        @click="folder.fullName && emit('select', folder.fullName)"
      >
        <IconifyIcon :icon="folderIcon(folder)" class="mail-folders__icon" />
        <span class="mail-folders__name">{{ folderDisplayName(folder) }}</span>
        <span
          v-if="folderCount(folder) != null"
          class="mail-folders__count"
          :title="folder.isInbox ? `未读 ${folderCount(folder)} 封` : undefined"
        >
          {{ folderCount(folder) }}
        </span>
      </button>
      <p v-if="!loading && folders.length === 0" class="mail-folders__empty">
        暂无文件夹
      </p>
    </div>
  </aside>
</template>

<style scoped>
.mail-folders {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: hsl(var(--background));
  border-right: 1px solid hsl(var(--border));
}

.mail-folders__account {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 14px 14px 4px;
}

.mail-folders__account-name,
.mail-folders__account-mail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-folders__account-name {
  font-size: 13px;
  font-weight: 650;
  color: hsl(var(--foreground));
}

.mail-folders__account-mail {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.mail-folders__compose {
  padding: 12px;
}

.mail-folders__list {
  flex: 1;
  min-height: 0;
  padding: 0 8px 12px;
  overflow: auto;
}

.mail-folders__item {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  margin-bottom: 2px;
  color: hsl(var(--foreground));
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.mail-folders__item:hover {
  background: hsl(var(--primary) / 10%);
}

.mail-folders__item.is-active,
.mail-folders__item.is-active:hover {
  font-weight: 600;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 18%);
}

.mail-folders__icon {
  flex: none;
}

.mail-folders__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-folders__count {
  flex: none;
  min-width: 18px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: #fff;
  text-align: center;
  background: hsl(var(--primary));
  border-radius: 10px;
}

.mail-folders__empty {
  margin: 12px 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}
</style>
