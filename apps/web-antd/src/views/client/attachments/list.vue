<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';
import { formatDateTime } from '@vben/utils';

import {
  Button,
  Card,
  Empty,
  message,
  Modal,
  Select,
  Spin,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import { resolveModuleTypeByLabel } from '#/api/common/lookup';
import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import {
  addClientAttachments,
  deleteClientAttachments,
  getClientAttachments,
  getClientBillingPeriodAttachments,
} from '#/api/sea-export/client-admin';
import {
  getAttachmentDtlTypeList,
  getAttachmentDtlTypesByModuleTypes,
} from '#/api/system/attachment-dtl-type';
import { $t } from '#/locales';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { buildAttachmentUrl } from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';

defineOptions({
  name: 'ClientAttachments',
});

interface AttachmentTypeGroup {
  attachmentDtlTypeId: number | null;
  name: string;
  sortId: number;
  items: Omit<ClientAdminApi.ClientAttachmentItemDto, 'clientVisible'>[];
}

/** 账期附件项DTO */
interface BillingPeriodAttachmentItem {
  id?: number;
  attachmentId?: number;
  attachmentDtlTypeId?: number;
  attachmentDtlType?: ClientAdminApi.AttachmentDtlTypeSimpleDto | null;
  displayOrder?: number;
  url?: string;
  mediaType?: number;
  friendlyFileName?: string | null;
  fileLength?: number | null;
  creationTime?: string | null;
  creatorUserId?: number | null;
  creatorUserName?: string | null;
}

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

const perm = createAbpPermission('Admin.Client');
const { hasAccessByCodes } = useAccess();
const route = useRoute();

const loading = ref(false);
const uploadingTypeId = ref<number | null | undefined>(undefined);
const groups = ref<AttachmentTypeGroup[]>([]);
const allAttachmentTypes = ref<ClientAdminApi.AttachmentDtlTypeSimpleDto[]>([]);
/** 用户手动添加的非默认展示类型 */
const manualTypeIds = ref<number[]>([]);
const addOtherTypeVisible = ref(false);
const selectedOtherTypeId = ref<number | undefined>(undefined);

/** 账期附件列表 */
const billingPeriodAttachments = ref<BillingPeriodAttachmentItem[]>([]);
const billingPeriodLoading = ref(false);

/** 账期附件分组 */
const billingPeriodGroup = computed<AttachmentTypeGroup>(() => ({
  attachmentDtlTypeId: null,
  name: $t('client.attachment.billingPeriodAttachments'),
  sortId: -1,
  items: billingPeriodAttachments.value.map((item) => ({
    id: item.id,
    attachmentId: item.attachmentId,
    attachmentDtlTypeId: item.attachmentDtlTypeId,
    displayOrder: item.displayOrder ?? 0,
    url: item.url,
    mediaType: item.mediaType,
    friendlyFileName: item.friendlyFileName,
    fileLength: item.fileLength,
    creationTime: item.creationTime,
    creatorUserId: item.creatorUserId,
    creatorUserName: item.creatorUserName,
  })),
}));

const clientId = computed<string>(() => {
  const id = route.params.id || route.query.id;
  if (Array.isArray(id)) return id[0] || '';
  return id ? String(id) : '';
});

const canEdit = computed(() => hasAccessByCodes([perm.edit]));

const formatFileSize = (bytes?: number | null): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

const getGroupKey = (typeId: number | null) =>
  typeId === null ? 'null' : String(typeId);

const resolveGroupName = (
  typeId: number | null,
  typeInfo?: ClientAdminApi.AttachmentDtlTypeSimpleDto | null,
) => {
  if (typeInfo?.name) return typeInfo.name;
  if (typeId === null) {
    return $t('client.attachment.uncategorized');
  }
  return String(typeId);
};

const mergeGroups = (
  configuredTypes: ClientAdminApi.AttachmentDtlTypeSimpleDto[],
  attachmentGroups: ClientAdminApi.ClientAttachmentGroupDto[],
  extraTypeIds: number[] = [],
  allTypes: ClientAdminApi.AttachmentDtlTypeSimpleDto[] = [],
): AttachmentTypeGroup[] => {
  const itemsByTypeId = new Map<
    number | null,
    ClientAdminApi.ClientAttachmentItemDto[]
  >();
  const typeInfoById = new Map<
    number | null,
    ClientAdminApi.AttachmentDtlTypeSimpleDto | null
  >();

  for (const group of attachmentGroups) {
    const typeId = group.attachmentDtlTypeId ?? null;
    itemsByTypeId.set(typeId, group.items ?? []);
    typeInfoById.set(typeId, group.attachmentDtlType ?? null);
  }

  const merged: AttachmentTypeGroup[] = [];
  const seenTypeIds = new Set<number>();

  const sortedConfigured = [...configuredTypes].sort(
    (a, b) => (a.sortId ?? 0) - (b.sortId ?? 0),
  );

  for (const type of sortedConfigured) {
    seenTypeIds.add(type.id);
    merged.push({
      attachmentDtlTypeId: type.id,
      name: resolveGroupName(type.id, type),
      sortId: type.sortId ?? 0,
      items: itemsByTypeId.get(type.id) ?? [],
    });
  }

  for (const manualId of extraTypeIds) {
    if (seenTypeIds.has(manualId)) continue;
    const type =
      allTypes.find((item) => item.id === manualId) ??
      typeInfoById.get(manualId) ??
      null;
    seenTypeIds.add(manualId);
    merged.push({
      attachmentDtlTypeId: manualId,
      name: resolveGroupName(manualId, type),
      sortId: type?.sortId ?? 5000,
      items: itemsByTypeId.get(manualId) ?? [],
    });
  }

  for (const group of attachmentGroups) {
    const typeId = group.attachmentDtlTypeId ?? null;
    if (typeId !== null && seenTypeIds.has(typeId)) continue;
    if (
      typeId === null &&
      merged.some((item) => item.attachmentDtlTypeId === null)
    ) {
      continue;
    }

    const typeInfo =
      group.attachmentDtlType ?? typeInfoById.get(typeId) ?? null;
    merged.push({
      attachmentDtlTypeId: typeId,
      name: resolveGroupName(typeId, typeInfo),
      sortId: typeInfo?.sortId ?? 9999,
      items: group.items ?? [],
    });
  }

  return merged.sort((a, b) => a.sortId - b.sortId);
};

const displayedTypeIds = computed(() => {
  const ids = new Set<number>();
  for (const group of groups.value) {
    if (group.attachmentDtlTypeId != null) {
      ids.add(group.attachmentDtlTypeId);
    }
  }
  return ids;
});

const availableOtherTypes = computed(() => {
  return allAttachmentTypes.value.filter(
    (item) => !displayedTypeIds.value.has(item.id),
  );
});

const otherTypeOptions = computed(() =>
  availableOtherTypes.value.map((item) => ({
    label: item.name || String(item.id),
    value: item.id,
  })),
);

const openAddOtherTypeModal = () => {
  selectedOtherTypeId.value = undefined;
  addOtherTypeVisible.value = true;
};

const confirmAddOtherType = () => {
  if (selectedOtherTypeId.value == null) {
    message.warning($t('client.attachment.selectTypeRequired'));
    return;
  }
  if (!manualTypeIds.value.includes(selectedOtherTypeId.value)) {
    manualTypeIds.value.push(selectedOtherTypeId.value);
  }
  rebuildGroupsFromCache();
  addOtherTypeVisible.value = false;
  message.success($t('client.attachment.addOtherTypeSuccess'));
};

let cachedConfiguredTypes: ClientAdminApi.AttachmentDtlTypeSimpleDto[] = [];
let cachedAttachmentGroups: ClientAdminApi.ClientAttachmentGroupDto[] = [];

const rebuildGroupsFromCache = () => {
  groups.value = mergeGroups(
    cachedConfiguredTypes,
    cachedAttachmentGroups,
    manualTypeIds.value,
    allAttachmentTypes.value,
  );
};

const loadAttachments = async () => {
  if (!clientId.value) {
    message.warning($t('client.attachment.noClientId'));
    return;
  }

  loading.value = true;
  try {
    const moduleType = await resolveModuleTypeByLabel(
      $t('system.permission.moduleClient'),
    );

    const [moduleTypeResult, attachmentGroups, allTypes] = await Promise.all([
      moduleType == null
        ? Promise.resolve([])
        : getAttachmentDtlTypesByModuleTypes({ moduleTypes: [moduleType] }),
      getClientAttachments(clientId.value),
      getAttachmentDtlTypeList(),
    ]);

    allAttachmentTypes.value = allTypes ?? [];

    const configuredTypes =
      moduleTypeResult[0]?.attachmentDtlTypes?.filter(
        (item): item is ClientAdminApi.AttachmentDtlTypeSimpleDto =>
          typeof item.id === 'number',
      ) ?? [];

    cachedConfiguredTypes = configuredTypes;
    cachedAttachmentGroups = attachmentGroups ?? [];

    // 已有附件但不在默认配置中的类型，自动加入手动列表避免刷新后消失
    for (const group of cachedAttachmentGroups) {
      const typeId = group.attachmentDtlTypeId;
      if (typeId == null) continue;
      const isConfigured = configuredTypes.some((item) => item.id === typeId);
      if (!isConfigured && !manualTypeIds.value.includes(typeId)) {
        manualTypeIds.value.push(typeId);
      }
    }

    rebuildGroupsFromCache();
  } catch (error) {
    console.error('加载客户附件失败:', error);
    message.error($t('client.attachment.loadFailed'));
  } finally {
    loading.value = false;
  }
};

/** 加载账期附件列表 */
const loadBillingPeriodAttachments = async () => {
  if (!clientId.value) return;

  billingPeriodLoading.value = true;
  try {
    const attachments = await getClientBillingPeriodAttachments(clientId.value);
    billingPeriodAttachments.value = attachments ?? [];
  } catch (error) {
    console.error('加载账期附件失败:', error);
    message.error($t('client.attachment.loadFailed'));
  } finally {
    billingPeriodLoading.value = false;
  }
};

const isAllowedType = (file: File): boolean => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_TYPES.some((allowed) => allowed.replace('.', '') === ext);
};

const handleBeforeUpload = async (
  file: UploadFile,
  group: AttachmentTypeGroup,
) => {
  if (!canEdit.value || !clientId.value) return false;

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

  uploadingTypeId.value = group.attachmentDtlTypeId;
  try {
    const formData = new FormData();
    formData.append('file', rawFile);
    const resultList = await uploadFile(formData);
    if (!resultList?.length) {
      throw new Error('upload empty');
    }

    const uploaded = mapResultToAttachment(resultList[0]!);
    await addClientAttachments({
      id: clientId.value,
      attachments: [
        {
          attachmentId: Number(uploaded.attachmentId),
          attachmentDtlTypeId: group.attachmentDtlTypeId ?? undefined,
          displayOrder: group.items.length,
          url: uploaded.url,
        },
      ],
    });

    message.success($t('client.attachment.uploadSuccess'));
    await loadAttachments();
  } catch (error) {
    console.error('上传附件失败:', error);
    message.error($t('client.attachment.uploadFailed'));
  } finally {
    uploadingTypeId.value = undefined;
  }

  return false;
};

const handleDownload = (row: ClientAdminApi.ClientAttachmentItemDto) => {
  const url = row.url ? buildAttachmentUrl(row.url) : '';
  if (!url) {
    message.warning($t('client.attachment.noFileUrl'));
    return;
  }
  window.open(url, '_blank');
};

const handleDelete = (row: ClientAdminApi.ClientAttachmentItemDto) => {
  if (!canEdit.value || !clientId.value) return;

  const fileName =
    row.friendlyFileName?.split('/').pop() ||
    $t('system.basicData.attachmentFallback');

  Modal.confirm({
    title: $t('common.confirmDelete', [$t('client.attachment.title')]),
    content: $t('client.attachment.deleteConfirm', [fileName]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteClientAttachments({
          id: clientId.value,
          attachmentIds: [row.attachmentId!],
        });
        message.success($t('client.attachment.deleteSuccess'));
        await loadAttachments();
      } catch (error) {
        console.error('删除附件失败:', error);
        message.error($t('client.attachment.deleteFailed'));
      }
    },
  });
};

const getFileName = (row: ClientAdminApi.ClientAttachmentItemDto): string => {
  const name = row.friendlyFileName || row.url || '';
  return name.split('/').pop() || $t('system.basicData.attachmentFallback');
};

const getFileExtension = (
  row: ClientAdminApi.ClientAttachmentItemDto,
): string => {
  const source = row.friendlyFileName || row.url || '';
  const match = source.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? (match[1]?.toLowerCase() ?? '') : '';
};

const isImageFile = (row: ClientAdminApi.ClientAttachmentItemDto): boolean =>
  IMAGE_EXTENSIONS.has(getFileExtension(row));

const getFileIcon = (row: ClientAdminApi.ClientAttachmentItemDto): string => {
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
  row: ClientAdminApi.ClientAttachmentItemDto,
): string => {
  const ext = getFileExtension(row);
  if (ext === 'pdf') return '#e5252a';
  if (['doc', 'docx'].includes(ext)) return '#2b579a';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return '#217346';
  if (['ppt', 'pptx'].includes(ext)) return '#d24726';
  if (IMAGE_EXTENSIONS.has(ext)) return '#8b5cf6';
  return '#8c8c8c';
};

/** 获取账期附件文件名 */
const getBillingPeriodFileName = (row: BillingPeriodAttachmentItem): string => {
  const name = row.friendlyFileName || row.url || '';
  return name.split('/').pop() || $t('system.basicData.attachmentFallback');
};

/** 获取账期附件文件扩展名 */
const getBillingPeriodFileExtension = (
  row: BillingPeriodAttachmentItem,
): string => {
  const source = row.friendlyFileName || row.url || '';
  const match = source.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? (match[1]?.toLowerCase() ?? '') : '';
};

/** 判断账期附件是否为图片 */
const isBillingPeriodImageFile = (row: BillingPeriodAttachmentItem): boolean =>
  IMAGE_EXTENSIONS.has(getBillingPeriodFileExtension(row));

/** 获取账期附件图标 */
const getBillingPeriodFileIcon = (row: BillingPeriodAttachmentItem): string => {
  const ext = getBillingPeriodFileExtension(row);
  if (ext === 'pdf') return 'mdi:file-pdf-box';
  if (['doc', 'docx'].includes(ext)) return 'mdi:file-word-box';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'mdi:file-excel-box';
  if (['ppt', 'pptx'].includes(ext)) return 'mdi:file-powerpoint-box';
  if (['rar', 'zip'].includes(ext)) return 'mdi:folder-zip-outline';
  if (IMAGE_EXTENSIONS.has(ext)) return 'mdi:file-image-outline';
  return 'mdi:file-document-outline';
};

/** 获取账期附件图标颜色 */
const getBillingPeriodFileIconColor = (
  row: BillingPeriodAttachmentItem,
): string => {
  const ext = getBillingPeriodFileExtension(row);
  if (ext === 'pdf') return '#e5252a';
  if (['doc', 'docx'].includes(ext)) return '#2b579a';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return '#217346';
  if (['ppt', 'pptx'].includes(ext)) return '#d24726';
  if (IMAGE_EXTENSIONS.has(ext)) return '#8b5cf6';
  return '#8c8c8c';
};

const handlePreview = (row: ClientAdminApi.ClientAttachmentItemDto) => {
  if (!row.url) {
    message.warning($t('client.attachment.noFileUrl'));
    return;
  }
  openAttachmentViewer({
    url: row.url,
    fileName: getFileName(row),
    uploader: row.creatorUserName,
    creationTime: row.creationTime,
  });
};

/** 预览账期附件 */
const handleBillingPeriodPreview = (row: BillingPeriodAttachmentItem) => {
  if (!row.url) {
    message.warning($t('client.attachment.noFileUrl'));
    return;
  }
  openAttachmentViewer({
    url: row.url,
    fileName: getBillingPeriodFileName(row),
    uploader: row.creatorUserName,
    creationTime: row.creationTime,
  });
};

onMounted(() => {
  loadAttachments();
  loadBillingPeriodAttachments();
});
</script>

<template>
  <div class="client-attachments p-4">
    <Spin :spinning="loading">
      <div v-if="groups.length === 0 && !loading" class="py-12">
        <Empty :description="$t('client.attachment.empty')">
          <Button
            v-if="canEdit && availableOtherTypes.length > 0"
            type="primary"
            @click="openAddOtherTypeModal"
          >
            {{ $t('client.attachment.addOtherType') }}
          </Button>
        </Empty>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <!-- 账期附件卡片 -->
        <Card
          v-if="billingPeriodAttachments.length > 0"
          :key="'billing-period'"
          size="small"
          class="attachment-card"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <span class="font-medium">
                {{ $t('client.attachment.billingPeriodAttachments') }}
              </span>
              <span class="text-xs font-normal text-gray-400">
                {{
                  $t('client.attachment.fileCount', [
                    billingPeriodAttachments.length,
                  ])
                }}
              </span>
            </div>
          </template>

          <div class="attachment-card-list">
            <div
              v-for="item in billingPeriodAttachments"
              :key="item.id"
              class="attachment-file-item"
              @click="handleBillingPeriodPreview(item)"
            >
              <img
                v-if="isBillingPeriodImageFile(item) && item.url"
                :src="buildAttachmentUrl(item.url)"
                class="attachment-file-thumb"
                alt=""
              />
              <IconifyIcon
                v-else
                :icon="getBillingPeriodFileIcon(item)"
                :style="{ color: getBillingPeriodFileIconColor(item) }"
                class="size-8 shrink-0"
              />

              <div class="min-w-0 flex-1">
                <div
                  class="truncate text-sm"
                  :title="getBillingPeriodFileName(item)"
                >
                  {{ getBillingPeriodFileName(item) }}
                </div>
                <div
                  class="attachment-file-meta text-xs text-gray-400"
                  :title="
                    [
                      formatFileSize(item.fileLength),
                      item.creatorUserName
                        ? `${$t('client.attachment.uploader')}：${item.creatorUserName}`
                        : '',
                      item.creationTime
                        ? `${$t('client.attachment.uploadTime')}：${formatDateTime(item.creationTime)}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  "
                >
                  <span>{{ formatFileSize(item.fileLength) }}</span>
                  <span v-if="item.creatorUserName">
                    {{ $t('client.attachment.uploader') }}：{{
                      item.creatorUserName
                    }}
                  </span>
                  <span v-if="item.creationTime">
                    {{ $t('client.attachment.uploadTime') }}：{{
                      formatDateTime(item.creationTime)
                    }}
                  </span>
                </div>
              </div>

              <div class="attachment-file-actions" @click.stop>
                <Tooltip :title="$t('client.attachment.preview')">
                  <Button
                    type="text"
                    size="small"
                    @click="handleBillingPeriodPreview(item)"
                  >
                    <IconifyIcon icon="mdi:eye-outline" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </Card>

        <Card
          v-for="group in groups"
          :key="getGroupKey(group.attachmentDtlTypeId)"
          size="small"
          class="attachment-card"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <span class="truncate font-medium" :title="group.name">
                {{ group.name }}
              </span>
              <span class="text-xs font-normal text-gray-400">
                {{ $t('client.attachment.fileCount', [group.items.length]) }}
              </span>
            </div>
          </template>

          <template v-if="canEdit" #extra>
            <Upload
              :before-upload="(file) => handleBeforeUpload(file, group)"
              :disabled="uploadingTypeId === group.attachmentDtlTypeId"
              :show-upload-list="false"
              multiple
            >
              <Button
                type="link"
                size="small"
                class="px-0"
                :loading="uploadingTypeId === group.attachmentDtlTypeId"
              >
                <IconifyIcon icon="mdi:upload" class="mr-1 size-4" />
                {{ $t('client.attachment.upload') }}
              </Button>
            </Upload>
          </template>

          <div class="attachment-card-list">
            <div
              v-if="group.items.length === 0"
              class="py-6 text-center text-xs text-gray-400"
            >
              {{ $t('client.attachment.emptyType') }}
            </div>

            <div
              v-for="item in group.items"
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
                <div
                  class="attachment-file-meta text-xs text-gray-400"
                  :title="
                    [
                      formatFileSize(item.fileLength),
                      item.creatorUserName
                        ? `${$t('client.attachment.uploader')}：${item.creatorUserName}`
                        : '',
                      item.creationTime
                        ? `${$t('client.attachment.uploadTime')}：${formatDateTime(item.creationTime)}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  "
                >
                  <span>{{ formatFileSize(item.fileLength) }}</span>
                  <span v-if="item.creatorUserName">
                    {{ $t('client.attachment.uploader') }}：{{
                      item.creatorUserName
                    }}
                  </span>
                  <span v-if="item.creationTime">
                    {{ $t('client.attachment.uploadTime') }}：{{
                      formatDateTime(item.creationTime)
                    }}
                  </span>
                </div>
              </div>

              <div class="attachment-file-actions" @click.stop>
                <Tooltip :title="$t('client.attachment.preview')">
                  <Button type="text" size="small" @click="handlePreview(item)">
                    <IconifyIcon icon="mdi:eye-outline" />
                  </Button>
                </Tooltip>
                <Tooltip :title="$t('client.attachment.download')">
                  <Button
                    type="text"
                    size="small"
                    @click="handleDownload(item)"
                  >
                    <IconifyIcon icon="mdi:download" />
                  </Button>
                </Tooltip>
                <Tooltip v-if="canEdit" :title="$t('common.delete')">
                  <Button
                    type="text"
                    size="small"
                    danger
                    @click="handleDelete(item)"
                  >
                    <IconifyIcon icon="mdi:delete" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </Card>

        <button
          v-if="canEdit && availableOtherTypes.length > 0"
          type="button"
          class="attachment-add-card"
          @click="openAddOtherTypeModal"
        >
          <IconifyIcon icon="mdi:plus" class="size-6" />
          <span class="mt-1 text-sm">
            {{ $t('client.attachment.addOtherType') }}
          </span>
        </button>
      </div>
    </Spin>

    <Modal
      v-model:open="addOtherTypeVisible"
      :title="$t('client.attachment.addOtherType')"
      :ok-text="$t('common.confirm')"
      :cancel-text="$t('common.cancel')"
      @ok="confirmAddOtherType"
    >
      <div class="py-2">
        <div class="mb-2 text-sm text-gray-600">
          {{ $t('client.attachment.addOtherTypeTip') }}
        </div>
        <Select
          v-model:value="selectedOtherTypeId"
          :options="otherTypeOptions"
          :placeholder="$t('client.attachment.selectTypePlaceholder')"
          allow-clear
          class="w-full"
          show-search
          :filter-option="
            (input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
          "
        />
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.attachment-card :deep(.ant-card-body) {
  padding: 12px;
}

.attachment-card-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 180px;
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

.attachment-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background-color: transparent;
  border: 1px dashed hsl(var(--border));
  border-radius: 8px;
  transition:
    color 0.2s,
    border-color 0.2s;
}

.attachment-add-card:hover {
  color: hsl(var(--primary));
  border-color: hsl(var(--primary));
}
</style>
