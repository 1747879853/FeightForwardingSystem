<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';
import type { BillingPeriodAdminApi } from '#/api/sea-export/billing-period-admin';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';
import { useVbenForm } from '#/adapter/form';
import { useBillFormSchema } from './data';
import dayjs from 'dayjs';
import { ref, computed } from 'vue';

import {
  Button,
  message,
  Spin,
  Upload,
  Empty,
  Modal as AntModal,
} from 'ant-design-vue';

import { resolveModuleTypeByLabel } from '#/api/common/lookup';
import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import { getAttachmentDtlTypesByModuleTypes } from '#/api/system/attachment-dtl-type';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { buildAttachmentUrl } from '#/utils';
import { downloadAttachmentWithFriendlyName } from '#/utils/download-file';

const [paymentForm, paymentFormApi] = useVbenForm({
  compact: true,
  layout: 'vertical',
  schema: useBillFormSchema(),
  showDefaultActions: false,
  // 左栏约 2/3 宽，5 列是账期表单的既定布局
  wrapperClass: 'grid-cols-5',
  handleValuesChange: (values) => {
    if (values.settlementType !== undefined) {
      if (values.settlementType === 1) {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: false },
          { fieldName: 'settlementDay', hide: false },
          { fieldName: 'days', hide: true },
          { fieldName: 'addDays', hide: true },
        ]);
      } else if (values.settlementType === 2) {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: false },
          { fieldName: 'addDays', hide: true },
        ]);
      } else {
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: true },
          { fieldName: 'addDays', hide: false },
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
      attachmentId: uploaded.attachmentId,
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
  if (!row.url) {
    message.warning($t('seaExport.export.attachments.noFileUrl'));
    return;
  }
  void downloadAttachmentWithFriendlyName(row.url, getFileName(row));
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

const handlePreview = (row: BillingPeriodAdminApi.AttachmentItemDto) => {
  if (!row.url) {
    message.warning($t('seaExport.export.attachments.noFileUrl'));
    return;
  }
  openAttachmentViewer({
    url: row.url,
    fileName: getFileName(row),
    friendlyFileName: row.friendlyFileName,
    uploader: row.creatorUserName,
    creationTime: row.creationTime,
  });
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

    // 不在此处关闭弹窗：关闭时机交由父组件根据保存结果决定，
    // 保存成功才关闭，保存失败保持打开以保留用户已填写的内容
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      let data = modalApi.getData<Record<string, any>>();
      console.info('data', data);
      if (data.id) {
        editId.value = data.id;
        isEdit.value = true;

        // 先根据 settlementType 更新字段显示状态
        if (data.settlementType === 1) {
          paymentFormApi.updateSchema([
            { fieldName: 'months', hide: false },
            { fieldName: 'settlementDay', hide: false },
            { fieldName: 'days', hide: true },
            { fieldName: 'addDays', hide: true },
          ]);
        } else if (data.settlementType === 2) {
          paymentFormApi.updateSchema([
            { fieldName: 'months', hide: true },
            { fieldName: 'settlementDay', hide: true },
            { fieldName: 'days', hide: false },
            { fieldName: 'addDays', hide: true },
          ]);
        } else {
          paymentFormApi.updateSchema([
            { fieldName: 'months', hide: true },
            { fieldName: 'settlementDay', hide: true },
            { fieldName: 'days', hide: true },
            { fieldName: 'addDays', hide: false },
          ]);
        }

        // 处理 permanent 字段对 expiringTime 的影响
        if (data.permanent) {
          paymentFormApi.updateSchema([
            { fieldName: 'expiringTime', disabled: true },
          ]);
        } else {
          paymentFormApi.updateSchema([
            { fieldName: 'expiringTime', disabled: false },
          ]);
        }

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
          addDays: data.addDays,
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
        // 新增默认结算方式为票结，重置动态字段显隐：仅显示票结加天数
        paymentFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: true },
          { fieldName: 'addDays', hide: false },
        ]);
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
  <Modal :title="pageTitle" class="billing-period-modal w-[1200px]">
    <div class="billing-modal">
      <section class="billing-panel billing-panel--form">
        <header class="billing-panel__head">
          <span class="billing-panel__mark" aria-hidden="true"></span>
          <span class="billing-panel__icon">
            <IconifyIcon icon="mdi:file-document-edit-outline" class="size-4" />
          </span>
          <div class="billing-panel__head-text">
            <span class="billing-panel__title">账期配置</span>
            <span class="billing-panel__subtitle"
              >填写合同、结算与授信规则</span
            >
          </div>
        </header>
        <div class="billing-panel__body">
          <paymentForm />
        </div>
      </section>

      <section class="billing-panel billing-panel--attach">
        <header class="billing-panel__head">
          <span class="billing-panel__mark" aria-hidden="true"></span>
          <span class="billing-panel__icon">
            <IconifyIcon icon="mdi:paperclip" class="size-4" />
          </span>
          <div class="billing-panel__head-text">
            <span class="billing-panel__title">
              {{ $t('seaExport.export.attachments.title') }}
            </span>
            <span class="billing-panel__subtitle">
              {{
                $t('seaExport.export.attachments.fileCount', [
                  attachments.length,
                ])
              }}
            </span>
          </div>
        </header>

        <div class="billing-panel__body billing-panel__body--attach">
          <Spin class="billing-attach-spin" :spinning="loading || uploading">
            <Upload
              :before-upload="handleBeforeUpload"
              :show-upload-list="false"
              :disabled="uploading"
              drag
              multiple
            >
              <div
                class="billing-upload"
                :class="{ 'is-uploading': uploading }"
              >
                <span class="billing-upload__icon">
                  <IconifyIcon icon="mdi:cloud-upload-outline" class="size-7" />
                </span>
                <p class="billing-upload__title">点击或拖拽文件到此处上传</p>
                <p class="billing-upload__hint">
                  {{ $t('seaExport.export.attachments.uploadTip') }}
                </p>
              </div>
            </Upload>

            <div v-if="attachments.length === 0" class="billing-empty">
              <Empty
                :image-style="{ height: '48px' }"
                :description="$t('seaExport.export.attachments.emptyType')"
              />
            </div>

            <div v-else class="attachment-card-list">
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
                <span v-else class="attachment-file-icon">
                  <IconifyIcon
                    :icon="getFileIcon(item)"
                    :style="{ color: getFileIconColor(item) }"
                    class="size-7"
                  />
                </span>

                <div class="min-w-0 flex-1">
                  <div
                    class="attachment-file-name truncate"
                    :title="getFileName(item)"
                  >
                    {{ getFileName(item) }}
                  </div>
                  <div class="attachment-file-meta">
                    <span>{{ formatFileSize(item.fileLength) }}</span>
                    <span v-if="item.creationTime">
                      {{ dayjs(item.creationTime).format('YYYY-MM-DD HH:mm') }}
                    </span>
                  </div>
                </div>

                <div class="attachment-file-actions" @click.stop>
                  <Button
                    type="text"
                    size="small"
                    class="attachment-action-btn"
                    title="预览"
                    @click="handlePreview(item)"
                  >
                    <IconifyIcon icon="mdi:eye-outline" />
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    class="attachment-action-btn"
                    @click="handleDownload(item)"
                  >
                    <IconifyIcon icon="mdi:download" />
                  </Button>
                  <Button
                    type="text"
                    size="small"
                    danger
                    class="attachment-action-btn"
                    @click="handleDelete(index)"
                  >
                    <IconifyIcon icon="mdi:delete" />
                  </Button>
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </section>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
/* 左 2 右 1；行高取较高一侧，两侧卡片 stretch 同高 */
.billing-modal {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  align-items: stretch;
  width: 100%;
}

.billing-panel {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  min-width: 0;
  min-height: 100%;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 4px rgb(16 42 83 / 4%);
}

.billing-panel__head {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 70%,
    hsl(var(--background)) 100%
  );
  border-bottom: 1px solid hsl(var(--border));
}

.billing-panel__mark {
  flex-shrink: 0;
  width: 3px;
  height: 16px;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 85%),
    hsl(var(--primary))
  );
  border-radius: 2px;
}

.billing-panel__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 8px;
}

.billing-panel__head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.billing-panel__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: hsl(var(--foreground));
}

.billing-panel__subtitle {
  font-size: 12px;
  line-height: 1.3;
  color: #8c95a3;
}

.billing-panel__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  padding: 12px 16px 16px;
}

.billing-panel__body--attach {
  gap: 12px;
}

.billing-attach-spin {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.billing-panel__body--attach :deep(.ant-spin-nested-loading),
.billing-panel__body--attach :deep(.ant-spin-container) {
  display: flex !important;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.billing-panel__body--attach :deep(.ant-upload-wrapper),
.billing-panel__body--attach :deep(.ant-upload) {
  display: block;
  flex-shrink: 0;
  width: 100%;
}

/* 仅做控件宽度兜底，不覆盖 Vben Form 的 grid 列定义 */
.billing-panel--form :deep(.ant-input),
.billing-panel--form :deep(.ant-input-affix-wrapper),
.billing-panel--form :deep(.ant-select),
.billing-panel--form :deep(.ant-select-selector),
.billing-panel--form :deep(.ant-picker),
.billing-panel--form :deep(.ant-input-number),
.billing-panel--form :deep(textarea.ant-input) {
  width: 100%;
  max-width: 100%;
}

.billing-panel--attach :deep(.ant-upload.ant-upload-drag) {
  background: transparent;
  border: none;
}

.billing-panel--attach :deep(.ant-upload-btn) {
  padding: 0;
}

.billing-upload {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  cursor: pointer;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 5%) 0%,
    hsl(var(--background)) 100%
  );
  border: 1.5px dashed hsl(var(--primary) / 35%);
  border-radius: 10px;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.billing-upload:hover,
.billing-upload.is-uploading {
  background: hsl(var(--primary) / 8%);
  border-color: hsl(var(--primary) / 65%);
}

.billing-upload__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 12%);
  border-radius: 10px;
}

.billing-upload__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.billing-upload__hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: #94a3b8;
  text-align: center;
}

.billing-empty {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 12px;
  background: hsl(var(--muted) / 35%);
  border-radius: 8px;
}

.attachment-card-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
}

.attachment-file-item {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 52px;
  padding: 8px 10px;
  cursor: pointer;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.attachment-file-item:hover {
  background: hsl(var(--primary) / 5%);
  border-color: hsl(var(--primary) / 35%);
  box-shadow: 0 2px 8px hsl(var(--primary) / 8%);
}

.attachment-file-thumb,
.attachment-file-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  object-fit: cover;
  background: hsl(var(--primary) / 6%);
  border-radius: 8px;
}

.attachment-file-name {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.attachment-file-meta {
  display: flex;
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.attachment-file-meta > span + span::before {
  margin: 0 4px;
  content: '·';
}

.attachment-file-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.attachment-file-item:hover .attachment-file-actions {
  opacity: 1;
}

.attachment-action-btn {
  color: #64748b;
}

.attachment-action-btn:hover {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
}
</style>
