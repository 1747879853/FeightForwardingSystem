<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';
import type { BillingPeriodAdminApi } from '#/api/sea-export/billing-period-admin';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '#/locales';
import { useVbenForm } from '#/adapter/form';
import { useBillFormSchema } from './data';
import dayjs from 'dayjs';
import { ref, computed, onMounted } from 'vue';

import {
  Button,
  Card,
  message,
  Spin,
  Upload,
  Empty,
  Modal as AntModal,
} from 'ant-design-vue';

import AttachmentViewerModal from '#/adapter/component/file-preview/attachment-viewer-modal.vue';
import { resolveModuleTypeByLabel } from '#/api/common/lookup';
import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import { getAttachmentDtlTypesByModuleTypes } from '#/api/system/attachment-dtl-type';
import { buildAttachmentUrl } from '#/utils';

const [paymentForm, paymentFormApi] = useVbenForm({
  layout: 'vertical',
  schema: useBillFormSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-5',
  handleValuesChange: (values) => {
    if (values.settlementType !== undefined) {
      if (values.settlementType === 1) {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: false },
          { fieldName: 'settlementDay', hide: false },
          { fieldName: 'days', hide: true },
        ]);
      } else if (values.settlementType === 2) {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: false },
        ]);
      } else {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: true },
        ]);
      }
    }
    if (values.permanent !== undefined && values.permanent) {
      paymentFormApi.updateSchema([
        { fieldName: 'expiringTime', disabled: true },
      ]);
      paymentFormApi.setValues({ expiringTime: '' });
    } else if (values.permanent !== undefined && !values.permanent) {
      paymentFormApi.updateSchema([
        { fieldName: 'expiringTime', disabled: false },
      ]);
    }
  },
});

const emits = defineEmits(['add', 'edit']);

const editId = ref('');
const isEdit = ref(false);
const attachments = ref<BillingPeriodAdminApi.AttachmentItemDto[]>([]);
const loading = ref(false);
const uploading = ref(false);
const contractAttachmentDtlTypeId = ref<number | null>(null);

/** 图片扩展名集合，用于卡片内展示缩略图 */
const IMAGE_EXTENSIONS = new Set([
  'bmp',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]);

const ALLOWED_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.tif',
  '.tiff',
  '.zip',
  '.rar',
];

/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

const formatFileSize = (bytes?: number | null): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

const getFileName = (row: BillingPeriodAdminApi.AttachmentItemDto): string => {
  const name = row.friendlyFileName || row.url || '';
  return name.split('/').pop() || $t('system.basicData.attachmentFallback');
};

const getFileExtension = (
  row: BillingPeriodAdminApi.AttachmentItemDto,
): string => {
  const source = row.friendlyFileName || row.url || '';
  const match = source.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? (match[1] ?? '').toLowerCase() : '';
};

const isImageFile = (row: BillingPeriodAdminApi.AttachmentItemDto): boolean =>
  IMAGE_EXTENSIONS.has(getFileExtension(row));

const getFileIcon = (row: BillingPeriodAdminApi.AttachmentItemDto): string => {
  const ext = getFileExtension(row);
  if (ext === 'pdf') return 'mdi:file-pdf-box';
  if (['doc', 'docx'].includes(ext)) return 'mdi:file-word-box';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'mdi:file-excel-box';
  if (['ppt', 'pptx'].includes(ext)) return 'mdi:file-powerpoint-box';
  if (['rar', 'zip'].includes(ext)) return 'mdi:folder-zip-outline';
  if (IMAGE_EXTENSIONS.has(ext)) return 'mdi:file-image-outline';
  return 'mdi:file-document-outline';
};

const getFileIconColor = (
  row: BillingPeriodAdminApi.AttachmentItemDto,
): string => {
  const ext = getFileExtension(row);
  if (ext === 'pdf') return '#e5252a';
  if (['doc', 'docx'].includes(ext)) return '#2b579a';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return '#217346';
  if (['ppt', 'pptx'].includes(ext)) return '#d24726';
  if (IMAGE_EXTENSIONS.has(ext)) return '#8b5cf6';
  return '#8c8c8c';
};

const loadContractAttachmentTypeId = async () => {
  try {
    // 获取客户管理模块的附件类型
    const moduleType = await resolveModuleTypeByLabel(
      $t('seaExport.client.title'),
    );

    if (moduleType != null) {
      const result = await getAttachmentDtlTypesByModuleTypes({
        moduleTypes: [moduleType],
      });

      if (result?.length > 0 && result[0]?.attachmentDtlTypes) {
        const contractType = result[0].attachmentDtlTypes.find(
          (type) =>
            type.name?.includes('账期合同') ||
            type.name?.includes('Billing Period Contract'),
        );
        if (contractType) {
          contractAttachmentDtlTypeId.value = contractType.id;
          return;
        }
      }
    }

    // 如果没找到，尝试获取所有附件类型并查找
    const allTypes = await getAttachmentDtlTypesByModuleTypes();
    for (const item of allTypes || []) {
      if (item.attachmentDtlTypes) {
        const contractType = item.attachmentDtlTypes.find(
          (type) =>
            type.name?.includes('账期合同') ||
            type.name?.includes('Billing Period Contract'),
        );
        if (contractType) {
          contractAttachmentDtlTypeId.value = contractType.id;
          return;
        }
      }
    }

    // 如果还是没找到，使用默认值或提示错误
    console.warn('未找到"账期合同"附件类型，将使用null作为attachmentDtlTypeId');
    contractAttachmentDtlTypeId.value = null;
  } catch (error) {
    console.error('加载账期合同附件类型失败:', error);
    message.warning($t('seaExport.export.attachments.loadFailed'));
    contractAttachmentDtlTypeId.value = null;
  }
};

const loadAttachments = async (data: Record<string, any>) => {
  if (data.attachments && Array.isArray(data.attachments)) {
    attachments.value = data.attachments.map((item: any) => ({
      ...item,
      url: item.url ? buildAttachmentUrl(item.url) : item.url,
    }));
  } else {
    attachments.value = [];
  }
};

const isAllowedType = (file: File): boolean => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_TYPES.some((allowed) => allowed.replace('.', '') === ext);
};

const handleBeforeUpload = async (file: UploadFile) => {
  const rawFile = file as unknown as File;
  if (!isAllowedType(rawFile)) {
    message.error($t('component.fileUpload.typeNotAllowed'));
    return false;
  }

  const sizeMB = rawFile.size / 1024 / 1024;
  if (sizeMB > 10) {
    message.error($t('component.fileUpload.sizeExceeded', [10]));
    return false;
  }

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', rawFile);
    const resultList = await uploadFile(formData);
    if (!resultList?.length || !resultList[0]) {
      throw new Error('upload empty');
    }

    const uploaded = mapResultToAttachment(resultList[0]);
    const newAttachment: BillingPeriodAdminApi.AttachmentItemDto = {
      attachmentId: Number(uploaded.attachmentId),
      attachmentDtlTypeId: contractAttachmentDtlTypeId.value ?? undefined,
      clientVisible: false,
      displayOrder: attachments.value.length,
      url: uploaded.url,
      friendlyFileName: uploaded.friendlyFileName,
      fileLength: rawFile.size,
      creationTime: new Date().toISOString(),
      creatorUserName: '',
    };

    attachments.value.push(newAttachment);
    message.success($t('seaExport.export.attachments.uploadSuccess'));
  } catch (error) {
    console.error('上传附件失败:', error);
    message.error($t('seaExport.export.attachments.uploadFailed'));
  } finally {
    uploading.value = false;
  }

  return false;
};

const handleDownload = (row: BillingPeriodAdminApi.AttachmentItemDto) => {
  const url = row.url ? buildAttachmentUrl(row.url) : '';
  if (!url) {
    message.warning($t('seaExport.export.attachments.noFileUrl'));
    return;
  }
  window.open(url, '_blank');
};

const handleDelete = (index: number) => {
  if (index < 0 || index >= attachments.value.length) return;

  const attachment = attachments.value[index];
  if (!attachment) return;

  AntModal.confirm({
    title: $t('common.confirmDelete', [
      $t('seaExport.export.attachments.title'),
    ]),
    content: $t('seaExport.export.attachments.deleteConfirm', [
      getFileName(attachment),
    ]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    onOk: () => {
      attachments.value.splice(index, 1);
      message.success($t('seaExport.export.attachments.deleteSuccess'));
    },
  });
};

const previewOpen = ref(false);
const previewUrl = ref('');
const previewFileName = ref('');
const previewUploader = ref('');
const previewUploadTime = ref('');

const handlePreview = (row: BillingPeriodAdminApi.AttachmentItemDto) => {
  if (!row.url) {
    message.warning($t('seaExport.export.attachments.noFileUrl'));
    return;
  }
  previewUrl.value = row.url;
  previewFileName.value = getFileName(row);
  previewUploader.value = row.creatorUserName ?? '';
  previewUploadTime.value = row.creationTime
    ? dayjs(row.creationTime).format('YYYY-MM-DD HH:mm:ss')
    : '';
  previewOpen.value = true;
};

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    console.info('onConfirm');
    const paymentValues = await paymentFormApi.getValues();
    console.info('paymentValues', paymentValues);

    // 添加附件数据
    paymentValues.attachments = attachments.value.map((item) => ({
      attachmentId: item.attachmentId,
      attachmentDtlTypeId: item.attachmentDtlTypeId,
      clientVisible: item.clientVisible,
      displayOrder: item.displayOrder,
      url: item.url,
    }));

    if (!isEdit.value) {
      emits('add', paymentValues);
    } else {
      paymentValues.id = editId.value;
      emits('edit', paymentValues);
    }

    modalApi.close();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      let data = modalApi.getData<Record<string, any>>();
      console.info('data', data);
      if (data.id) {
        editId.value = data.id;
        isEdit.value = true;
        const formData = {
          contractNo: data.contractNo,
          dateType: data.dateType ?? 0,
          creditCurrencyId: data.creditCurrencyId,
          creditLimit: data.creditLimit,
          warningLimit: data.warningLimit,
          permanent: data.permanent,
          effectiveTime: toDayjs(data.effectiveTime),
          expiringTime: toDayjs(data.expiringTime),
          bizTypes: data.bizTypes,
          settlementType: data.settlementType,
          months: data.months,
          settlementDay: data.settlementDay,
          days: data.days,
          remark: data.remark,
          codeSourceIds:
            (data.cbpCodeSources as any[])?.map(
              (item: any) => item?.codeSourceId,
            ) || [],
          organizationUnitIds:
            (data.cbpOrgs as any[])?.map(
              (item: any) => item?.organizationUnitId,
            ) || [],
          userIds:
            (data.cbpUsers as any[])?.map((item: any) => item?.userId) || [],
        };
        paymentFormApi.setValues(formData);
        loadAttachments(data);
      } else {
        isEdit.value = false;
        paymentFormApi.resetForm();
        attachments.value = [];
      }
      loadContractAttachmentTypeId();
    }
  },
});
const pageTitle = computed(() => {
  return isEdit.value
    ? $t('ui.actionTitle.edit', [$t('seaExport.client.paymentTerms.title')])
    : $t('ui.actionTitle.create', [$t('seaExport.client.paymentTerms.title')]);
});
</script>
<template>
  <Modal :title="pageTitle" width="1200px">
    <div class="grid grid-cols-3 gap-4">
      <div class="col-span-2">
        <paymentForm></paymentForm>
      </div>
      <div class="col-span-1">
        <Card size="small" class="h-full">
          <template #title>
            <div class="flex items-center gap-2">
              <span class="font-medium">
                {{ $t('seaExport.export.attachments.title') }}
              </span>
              <span class="text-xs font-normal text-gray-400">
                {{
                  $t('seaExport.export.attachments.fileCount', [
                    attachments.length,
                  ])
                }}
              </span>
            </div>
          </template>

          <Spin :spinning="loading || uploading">
            <div v-if="attachments.length === 0" class="py-6 text-center">
              <Empty
                :description="$t('seaExport.export.attachments.emptyType')"
              />
            </div>

            <div class="attachment-card-list">
              <div
                v-for="(item, index) in attachments"
                :key="item.attachmentId"
                class="attachment-file-item"
                @click="handlePreview(item)"
              >
                <img
                  v-if="isImageFile(item) && item.url"
                  :src="buildAttachmentUrl(item.url)"
                  class="attachment-file-thumb"
                  alt=""
                />
                <IconifyIcon
                  v-else
                  :icon="getFileIcon(item)"
                  :style="{ color: getFileIconColor(item) }"
                  class="size-8 shrink-0"
                />

                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm" :title="getFileName(item)">
                    {{ getFileName(item) }}
                  </div>
                  <div class="attachment-file-meta text-xs text-gray-400">
                    <span>{{ formatFileSize(item.fileLength) }}</span>
                    <span v-if="item.creationTime">
                      {{ $t('seaExport.export.attachments.uploadTime') }}：{{
                        dayjs(item.creationTime).format('YYYY-MM-DD HH:mm:ss')
                      }}
                    </span>
                  </div>
                </div>

                <div class="attachment-file-actions" @click.stop>
                  <Button type="text" size="small" @click="handlePreview(item)">
                    <IconifyIcon icon="mdi:eye-outline" />
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    @click="handleDownload(item)"
                  >
                    <IconifyIcon icon="mdi:download" />
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    danger
                    @click="handleDelete(index)"
                  >
                    <IconifyIcon icon="mdi:delete" />
                  </Button>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <Upload
                :before-upload="handleBeforeUpload"
                :show-upload-list="false"
                :disabled="uploading"
                drag
                multiple
              >
                <div
                  class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-8 transition-colors hover:border-primary"
                >
                  <IconifyIcon
                    icon="mdi:upload"
                    class="mb-2 size-8 text-gray-400"
                  />
                  <span class="text-sm text-gray-600">
                    {{ $t('seaExport.export.attachments.uploadTip') }}
                  </span>
                </div>
              </Upload>
            </div>
          </Spin>
        </Card>
      </div>
    </div>

    <AttachmentViewerModal
      v-model:open="previewOpen"
      :file-url="previewUrl"
      :file-name="previewFileName"
      :uploader="previewUploader"
      :upload-time="previewUploadTime"
    />
  </Modal>
</template>

<style scoped>
.attachment-card-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.attachment-file-item {
  display: flex;
  flex: 0 0 54px;
  gap: 10px;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.attachment-file-item:hover {
  background-color: hsl(var(--accent));
  border-color: hsl(var(--border));
}

.attachment-file-thumb {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
}

.attachment-file-meta {
  display: flex;
  gap: 0;
  overflow: hidden;
  white-space: nowrap;
}

.attachment-file-meta > span {
  flex-shrink: 0;
}

.attachment-file-meta > span + span::before {
  margin: 0 4px;
  content: '·';
}

.attachment-file-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.attachment-file-item:hover .attachment-file-actions {
  opacity: 1;
}
</style>
