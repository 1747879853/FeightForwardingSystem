<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';
import type { AttachmentDtlTypeApi } from '#/api/system/attachment-dtl-type';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Empty, Spin, Upload, message } from 'ant-design-vue';

import { resolveModuleTypeByLabel } from '#/api/common/lookup';
import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import { addPaymentApplicationAttachments } from '#/api/settlement-management/payment-application-admin';
import { getAttachmentDtlTypesByModuleTypes } from '#/api/system/attachment-dtl-type';
import { $t } from '#/locales';
import { buildAttachmentUrl } from '#/utils';

interface AttachmentGroupView {
  attachmentDtlTypeId: null | number;
  items: PaymentApplicationAdminApi.AttachmentItemForItemInputDto[];
  name: string;
  sortId: number;
}

const props = withDefaults(
  defineProps<{
    /**
     * 已持久化的付费申请 id。
     * - 可编辑：不调用绑定接口，本地改完随 Add/Edit 的 attachmentGroup 全量保存。
     * - 只读追加：调用 AddAttachments 仅追加绑定。
     */
    applicationId?: string;
    /**
     * true：不可删除/改已有分组内容；若有 applicationId 仍可上传并走 AddAttachments 追加。
     * false：可增删，仅本地维护，等表单保存。
     */
    disabled?: boolean;
  }>(),
  { applicationId: undefined, disabled: false },
);

const modelValue = defineModel<
  PaymentApplicationAdminApi.AttachmentGroupInputDto[]
>({ default: () => [] });

const loading = ref(false);
const uploadingTypeId = ref<null | number>(null);
const attachmentTypes = ref<AttachmentDtlTypeApi.AttachmentDtlTypeSimpleDto[]>(
  [],
);

/** 可编辑：本地维护，随 Add/Edit 保存 */
const canEditLocally = computed(() => !props.disabled);
/** 只读追加：有单据 id，上传后立即 AddAttachments */
const canAppendRemote = computed(() => props.disabled && !!props.applicationId);
const canUpload = computed(() => canEditLocally.value || canAppendRemote.value);

const groupKey = (id: null | number) => (id == null ? 'untyped' : String(id));

const groups = computed<AttachmentGroupView[]>(() => {
  const existingById = new Map(
    (modelValue.value ?? []).map((group) => [
      group.attachmentDtlTypeId ?? null,
      group.items ?? [],
    ]),
  );
  const result: AttachmentGroupView[] = attachmentTypes.value.map((type) => ({
    attachmentDtlTypeId: type.id,
    items: existingById.get(type.id) ?? [],
    name: type.name || String(type.id),
    sortId: type.sortId ?? 0,
  }));
  const rendered = new Set(result.map((group) => group.attachmentDtlTypeId));
  for (const [typeId, items] of existingById) {
    if (rendered.has(typeId)) continue;
    result.push({
      attachmentDtlTypeId: typeId,
      items,
      name: typeId == null ? '未分类' : String(typeId),
      sortId: 9999,
    });
  }
  return result.sort((a, b) => a.sortId - b.sortId);
});

function updateGroup(
  typeId: null | number,
  items: PaymentApplicationAdminApi.AttachmentItemForItemInputDto[],
) {
  const otherGroups = (modelValue.value ?? []).filter(
    (group) => (group.attachmentDtlTypeId ?? null) !== typeId,
  );
  modelValue.value = [...otherGroups, { attachmentDtlTypeId: typeId, items }];
}

async function loadAttachmentTypes() {
  loading.value = true;
  try {
    const moduleType = await resolveModuleTypeByLabel(
      $t('system.permission.modulePaymentApplication'),
    );
    if (moduleType == null) return;
    const results = await getAttachmentDtlTypesByModuleTypes({
      moduleTypes: [moduleType],
    });
    attachmentTypes.value = (results[0]?.attachmentDtlTypes ?? []).filter(
      (type): type is AttachmentDtlTypeApi.AttachmentDtlTypeSimpleDto =>
        typeof type.id === 'number',
    );
  } finally {
    loading.value = false;
  }
}

/**
 * 1) 通用上传拿 attachmentId
 * 2) 可编辑 → 只写入本地 attachmentGroup，等 Add/Edit
 * 3) 只读追加 → AddAttachments 平铺追加绑定
 */
async function handleUpload(file: UploadFile, group: AttachmentGroupView) {
  if (!canUpload.value) return false;
  const rawFile = file as unknown as File;
  uploadingTypeId.value = group.attachmentDtlTypeId;
  try {
    const formData = new FormData();
    formData.append('file', rawFile);
    const uploaded = (await uploadFile(formData))[0];
    if (!uploaded) throw new Error('Upload returned no file.');
    const attachment = mapResultToAttachment(uploaded);
    const item: PaymentApplicationAdminApi.AttachmentItemForItemInputDto = {
      attachmentId: Number(attachment.attachmentId),
      attachmentDtlTypeId: group.attachmentDtlTypeId,
      clientVisible: false,
      displayOrder: group.items.length,
      friendlyFileName: attachment.friendlyFileName || attachment.fileName,
      url: attachment.url,
    };

    if (canAppendRemote.value) {
      await addPaymentApplicationAttachments({
        id: props.applicationId!,
        attachments: [item],
      });
      message.success('附件已追加');
    }

    updateGroup(group.attachmentDtlTypeId, [...group.items, item]);
  } catch (error: any) {
    message.error(error?.message || '上传失败');
  } finally {
    uploadingTypeId.value = null;
  }
  return false;
}

function removeAttachment(group: AttachmentGroupView, index: number) {
  if (!canEditLocally.value) return;
  updateGroup(
    group.attachmentDtlTypeId,
    group.items.filter((_, itemIndex) => itemIndex !== index),
  );
}

function getFileName(
  item: PaymentApplicationAdminApi.AttachmentItemForItemInputDto,
) {
  return item.friendlyFileName || item.url?.split('/').pop() || '附件';
}

function openAttachment(
  item: PaymentApplicationAdminApi.AttachmentItemForItemInputDto,
) {
  if (item.url) window.open(buildAttachmentUrl(item.url), '_blank');
}

onMounted(loadAttachmentTypes);
</script>

<template>
  <Spin :spinning="loading" class="payment-attachment-groups">
    <Empty
      v-if="groups.length === 0 && !loading"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      description="暂无附件类型"
    />
    <div v-else class="attachment-type-grid">
      <section
        v-for="group in groups"
        :key="groupKey(group.attachmentDtlTypeId)"
        class="attachment-group"
      >
        <header class="attachment-group__header">
          <span class="attachment-group__title">{{ group.name }}</span>
        </header>
        <Upload
          v-if="canUpload"
          class="attachment-group__upload"
          :before-upload="(file) => handleUpload(file, group)"
          :disabled="uploadingTypeId === group.attachmentDtlTypeId"
          :show-upload-list="false"
          multiple
        >
          <Button
            type="text"
            size="small"
            :loading="uploadingTypeId === group.attachmentDtlTypeId"
            aria-label="上传附件"
          >
            <IconifyIcon icon="mdi:upload" />
          </Button>
        </Upload>
        <div v-if="group.items.length" class="attachment-group__files">
          <div
            v-for="(item, index) in group.items"
            :key="`${item.attachmentId}-${index}`"
            class="attachment-file"
          >
            <button
              type="button"
              class="attachment-file__name"
              :title="getFileName(item)"
              @click="openAttachment(item)"
            >
              <IconifyIcon
                class="attachment-file__icon"
                icon="mdi:file-outline"
              />
              <span class="attachment-file__text">{{ getFileName(item) }}</span>
            </button>
            <Button
              v-if="canEditLocally"
              type="text"
              size="small"
              class="attachment-file__remove"
              aria-label="删除附件"
              @click="removeAttachment(group, index)"
            >
              <IconifyIcon icon="mdi:delete-outline" />
            </Button>
          </div>
        </div>
        <div v-else class="attachment-group__empty">暂无文件</div>
      </section>
    </div>
  </Spin>
</template>

<style scoped>
.payment-attachment-groups {
  display: block;
}

.attachment-type-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  max-height: 97px;
  overflow-y: auto;
}

.attachment-group {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 97px;
  padding: 8px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
  transition: height 0.28s ease;
}

.attachment-group__header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.attachment-group__upload {
  position: absolute;
  top: 3px;
  right: 3px;
}

.attachment-group__title {
  display: block;
  padding-right: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  font-weight: 400;
  color: #374151;
  white-space: nowrap;
}

.attachment-group__files {
  display: grid;
  gap: 2px;
  min-width: 0;
  margin-top: 2px;
}

.attachment-file {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  line-height: 20px;
}

.attachment-file__name {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
  align-items: center;
  min-width: 0;
  padding: 0;
  font-size: 11px;
  line-height: 20px;
  color: #64748b;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.attachment-file__icon {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}

.attachment-file__text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-file__remove {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  min-width: 20px;
  height: 20px;
  padding: 0;
  line-height: 1;
  color: #94a3b8;
}

.attachment-file__remove :deep(.anticon),
.attachment-file__remove :deep(svg) {
  display: block;
  font-size: 16px;
  line-height: 1;
}

.attachment-file__remove:hover {
  color: #ef4444;
}

.attachment-group__empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 0;
  font-size: 11px;
  color: #94a3b8;
}
</style>
