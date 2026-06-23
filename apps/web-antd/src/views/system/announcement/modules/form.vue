<script lang="ts" setup>
import type { Attachment } from '#/api/common/upload';
import type { AnnouncementAdminApi } from '#/api/system/announcement-admin';

import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import dayjs from 'dayjs';
import { message } from 'ant-design-vue';

import RichTextEditor from '#/adapter/component/rich-text-editor.vue';
import FileUploadInput from '#/adapter/component/file-upload/file-upload-input.vue';
import { useVbenForm } from '#/adapter/form';
import {
  addAnnouncement,
  editAnnouncement,
  getAnnouncementDetail,
} from '#/api/system/announcement-admin';
import { $t } from '#/locales';
import { isRichTextEmpty } from '#/utils/sanitize-html';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: []; 'confirm-start': [] }>();

const formData = ref<AnnouncementAdminApi.AnnouncementDto>();
const richText = ref('');
const attachments = ref<Attachment[]>([]);
const editorReady = ref(false);
const detailLoading = ref(false);
const editorMountKey = ref(0);

const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.announcement.name')])
    : $t('ui.actionTitle.create', [$t('system.announcement.name')]);
});

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const toDayjs = (value: unknown) => {
  if (!value) {
    return undefined;
  }
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed : undefined;
};

const toIsoString = (value: unknown) => {
  if (!value) {
    return undefined;
  }
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const mapAttachmentsToInput = (
  items?: AnnouncementAdminApi.AttachmentItemDto[] | null,
): Attachment[] => {
  return (items ?? []).map((item) => ({
    attachmentId: item.attachmentId ?? item.id ?? 0,
    fileName: item.friendlyFileName || `attachment-${item.attachmentId}`,
    friendlyFileName: item.friendlyFileName || undefined,
    url: item.url || '',
  }));
};

const mapAttachmentsToPayload =
  (): AnnouncementAdminApi.AttachmentItemForItemInputDto[] => {
    return attachments.value.map((item, index) => ({
      attachmentId: Number(item.attachmentId),
      displayOrder: index,
      url: item.url,
      clientVisible: true,
    }));
  };

const buildPayload = async () => {
  const values = await formApi.getValues();
  if (isRichTextEmpty(richText.value)) {
    message.warning(
      $t('ui.formRules.required', [$t('system.announcement.text')]),
    );
    return null;
  }

  const attachmentItems = mapAttachmentsToPayload();
  return {
    name: values.name,
    text: richText.value,
    enable: values.enable,
    startTime: toIsoString(values.startTime),
    endTime: toIsoString(values.endTime),
    sortId: values.sortId ?? 0,
    remark: values.remark || undefined,
    organizationUnitIds: values.organizationUnitIds?.length
      ? values.organizationUnitIds
      : undefined,
    attachments: attachmentItems.length > 0 ? attachmentItems : undefined,
  };
};

const mountEditor = async () => {
  editorMountKey.value += 1;
  await nextTick();
  editorReady.value = true;
};

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-full max-w-[960px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    const payload = await buildPayload();
    if (!payload) {
      return;
    }

    emit('confirm-start');
    drawerApi.lock();
    try {
      if (formData.value?.id) {
        await editAnnouncement({
          id: formData.value.id,
          ...payload,
        });
      } else {
        await addAnnouncement(payload);
      }
      message.success($t('ui.actionMessage.operationSuccess'));
    } finally {
      drawerApi.lock(false);
    }
    await drawerApi.close();
    emit('success');
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      editorReady.value = false;
      richText.value = '';
      attachments.value = [];
      return;
    }

    const data = drawerApi.getData<{ id?: number }>();
    if (data?.id) {
      detailLoading.value = true;
      editorReady.value = false;
      try {
        const detail = await getAnnouncementDetail(data.id);
        formData.value = detail;
        richText.value = detail.text || '';
        attachments.value = mapAttachmentsToInput(detail.attachments);
        formApi.setValues({
          name: detail.name,
          enable: detail.enable ?? true,
          startTime: toDayjs(detail.startTime),
          endTime: toDayjs(detail.endTime),
          sortId: detail.sortId ?? 0,
          remark: detail.remark,
          organizationUnitIds:
            detail.organizationUnits?.map((item) => item.id).filter(Boolean) ??
            [],
        });
      } finally {
        detailLoading.value = false;
      }
      await mountEditor();
      return;
    }

    formData.value = undefined;
    richText.value = '';
    attachments.value = [];
    formApi.resetForm();
    await mountEditor();
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <div class="mx-4 flex flex-col gap-4">
      <Form />
      <div class="col-span-2 flex flex-col gap-2">
        <div class="text-sm font-medium">
          {{ $t('system.announcement.text') }}
          <span class="text-destructive">*</span>
        </div>
        <div
          v-if="detailLoading"
          class="flex min-h-[360px] items-center justify-center rounded-md border border-dashed border-[#d9d9d9] text-sm text-foreground/60"
        >
          加载中...
        </div>
        <RichTextEditor
          v-else-if="editorReady"
          :key="editorMountKey"
          v-model="richText"
        />
      </div>
      <div class="col-span-2 flex flex-col gap-2">
        <div class="text-sm font-medium">
          {{ $t('system.announcement.attachments') }}
        </div>
        <FileUploadInput v-model="attachments" :max-count="20" />
      </div>
    </div>
  </Drawer>
</template>
