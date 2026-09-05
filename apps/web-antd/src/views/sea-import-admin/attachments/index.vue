<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { computed, onMounted, ref } from 'vue';

import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';
import { formatDateTime } from '@vben/utils';

import {
  Button,
  Card,
  Checkbox,
  Empty,
  message,
  Modal,
  Select,
  Spin,
  Switch,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import { resolveModuleTypeByLabel } from '#/api/common/lookup';
import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import {
  addSeaImportAttachments,
  deleteSeaImportAttachments,
  getSeaImportAttachments,
} from '#/api/sea-import/sea-import-admin';
import { updateAttachmentItemsClientVisible } from '#/api/system/attachment';
import {
  getAttachmentDtlTypeList,
  getAttachmentDtlTypesByModuleTypes,
} from '#/api/system/attachment-dtl-type';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';
import { $t } from '#/locales';
import { openAttachmentViewer } from '#/components/attachment-viewer';
import { buildAttachmentUrl } from '#/utils';
import { createAbpPermission } from '#/utils/abp-permission';

defineOptions({
  name: 'SeaImportAttachments',
});

interface AttachmentTypeGroup {
  attachmentDtlTypeId: number | null;
  name: string;
  sortId: number;
  items: SeaImportAdminApi.AttachmentItemDto[];
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

const perm = createAbpPermission('Admin.SeaImport');
const { hasAccessByCodes } = useAccess();
const seaImportIdRef = useKeepAliveRouteParamId();

const loading = ref(false);
const uploadingTypeId = ref<number | null | undefined>(undefined);
/** 当前拖拽悬停的附件类型 id（含 null=未分类） */
const dragOverTypeId = ref<number | null | undefined>(undefined);
const groups = ref<AttachmentTypeGroup[]>([]);
const clientVisibleByTypeId = ref<Map<number | null, boolean>>(new Map());
const allAttachmentTypes = ref<SeaImportAdminApi.AttachmentDtlTypeSimpleDto[]>(
  [],
);
/** 用户手动添加的非默认展示类型 */
const manualTypeIds = ref<number[]>([]);
const addOtherTypeVisible = ref(false);
const selectedOtherTypeId = ref<number | undefined>(undefined);

const seaImportId = computed(() => seaImportIdRef.value ?? '');

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

const getClientVisible = (typeId: number | null) =>
  clientVisibleByTypeId.value.get(typeId) ?? false;

const setClientVisible = (typeId: number | null, value: boolean) => {
  clientVisibleByTypeId.value.set(typeId, value);
};

/** 单文件客户可见性更新中的 AttachmentItem id 集合 */
const visibilityUpdatingItemIds = ref<Set<number>>(new Set());
/** 类型批量更新中的 attachmentDtlTypeId 集合 */
const visibilityUpdatingGroupIds = ref<Set<number | null>>(new Set());

const isItemVisibilityUpdating = (item: SeaImportAdminApi.AttachmentItemDto) =>
  typeof item.id === 'number' && visibilityUpdatingItemIds.value.has(item.id);

const isGroupVisibilityUpdating = (group: AttachmentTypeGroup) =>
  visibilityUpdatingGroupIds.value.has(group.attachmentDtlTypeId);

/** 类型头 Checkbox 选中态：有附件时反映「全部可见」，否则回退为上传默认值 */
const getGroupVisibleChecked = (group: AttachmentTypeGroup) => {
  if (group.items.length === 0) {
    return getClientVisible(group.attachmentDtlTypeId);
  }
  return group.items.every((item) => item.clientVisible === true);
};

/** 类型头 Checkbox 半选态：部分附件可见 */
const getGroupVisibleIndeterminate = (group: AttachmentTypeGroup) => {
  if (group.items.length === 0) return false;
  const visibleCount = group.items.filter(
    (item) => item.clientVisible === true,
  ).length;
  return visibleCount > 0 && visibleCount < group.items.length;
};

/** 类型批量修改客户可见：同步上传默认值，并批量更新该类型下既有附件 */
const handleGroupVisibleChange = async (
  group: AttachmentTypeGroup,
  value: boolean,
) => {
  setClientVisible(group.attachmentDtlTypeId, value);

  const targets = group.items.filter(
    (item) => typeof item.id === 'number' && item.id > 0,
  );
  if (targets.length === 0) return;

  const groupId = group.attachmentDtlTypeId;
  visibilityUpdatingGroupIds.value = new Set(
    visibilityUpdatingGroupIds.value,
  ).add(groupId);
  try {
    await updateAttachmentItemsClientVisible(
      targets.map((item) => ({ id: item.id as number, clientVisible: value })),
    );
    for (const item of group.items) {
      item.clientVisible = value;
    }
    message.success($t('seaImport.import.attachments.visibilityUpdateSuccess'));
  } catch (error) {
    console.error('更新客户可见性失败:', error);
    message.error($t('seaImport.import.attachments.visibilityUpdateFailed'));
  } finally {
    const next = new Set(visibilityUpdatingGroupIds.value);
    next.delete(groupId);
    visibilityUpdatingGroupIds.value = next;
  }
};

/** 单文件切换客户可见 */
const handleItemVisibleChange = async (
  item: SeaImportAdminApi.AttachmentItemDto,
  value: boolean,
) => {
  if (typeof item.id !== 'number' || item.id <= 0) return;

  const itemId = item.id;
  visibilityUpdatingItemIds.value = new Set(
    visibilityUpdatingItemIds.value,
  ).add(itemId);
  try {
    await updateAttachmentItemsClientVisible([
      { id: itemId, clientVisible: value },
    ]);
    item.clientVisible = value;
    message.success($t('seaImport.import.attachments.visibilityUpdateSuccess'));
  } catch (error) {
    console.error('更新客户可见性失败:', error);
    message.error($t('seaImport.import.attachments.visibilityUpdateFailed'));
  } finally {
    const next = new Set(visibilityUpdatingItemIds.value);
    next.delete(itemId);
    visibilityUpdatingItemIds.value = next;
  }
};

const resolveGroupName = (
  typeId: number | null,
  typeInfo?: SeaImportAdminApi.AttachmentDtlTypeSimpleDto | null,
) => {
  if (typeInfo?.name) return typeInfo.name;
  if (typeId === null) {
    return $t('seaImport.import.attachments.uncategorized');
  }
  return String(typeId);
};

const mergeGroups = (
  configuredTypes: SeaImportAdminApi.AttachmentDtlTypeSimpleDto[],
  attachmentGroups: SeaImportAdminApi.AttachmentGroupDto[],
  extraTypeIds: number[] = [],
  allTypes: SeaImportAdminApi.AttachmentDtlTypeSimpleDto[] = [],
): AttachmentTypeGroup[] => {
  const itemsByTypeId = new Map<
    number | null,
    SeaImportAdminApi.AttachmentItemDto[]
  >();
  const typeInfoById = new Map<
    number | null,
    SeaImportAdminApi.AttachmentDtlTypeSimpleDto | null
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
    message.warning($t('seaImport.import.attachments.selectTypeRequired'));
    return;
  }
  if (!manualTypeIds.value.includes(selectedOtherTypeId.value)) {
    manualTypeIds.value.push(selectedOtherTypeId.value);
  }
  rebuildGroupsFromCache();
  addOtherTypeVisible.value = false;
  message.success($t('seaImport.import.attachments.addOtherTypeSuccess'));
};

let cachedConfiguredTypes: SeaImportAdminApi.AttachmentDtlTypeSimpleDto[] = [];
let cachedAttachmentGroups: SeaImportAdminApi.AttachmentGroupDto[] = [];

const rebuildGroupsFromCache = () => {
  groups.value = mergeGroups(
    cachedConfiguredTypes,
    cachedAttachmentGroups,
    manualTypeIds.value,
    allAttachmentTypes.value,
  );
};

const loadAttachments = async () => {
  if (!seaImportId.value) {
    message.warning($t('seaImport.import.attachments.noSeaImportId'));
    return;
  }

  loading.value = true;
  try {
    const moduleType = await resolveModuleTypeByLabel(
      $t('system.permission.moduleSeaImport'),
    );

    const [moduleTypeResult, attachmentGroups, allTypes] = await Promise.all([
      moduleType == null
        ? Promise.resolve([])
        : getAttachmentDtlTypesByModuleTypes({ moduleTypes: [moduleType] }),
      getSeaImportAttachments(seaImportId.value),
      getAttachmentDtlTypeList(),
    ]);

    allAttachmentTypes.value = allTypes ?? [];

    const configuredTypes =
      moduleTypeResult[0]?.attachmentDtlTypes?.filter(
        (item): item is SeaImportAdminApi.AttachmentDtlTypeSimpleDto =>
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
    console.error('加载海运进口附件失败:', error);
    message.error($t('seaImport.import.attachments.loadFailed'));
  } finally {
    loading.value = false;
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
  if (!canEdit.value || !seaImportId.value) return false;

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
    const firstResult = resultList?.[0];
    if (!firstResult) {
      throw new Error('upload empty');
    }

    const uploaded = mapResultToAttachment(firstResult);
    await addSeaImportAttachments({
      id: seaImportId.value,
      attachments: [
        {
          attachmentId: Number(uploaded.attachmentId),
          attachmentDtlTypeId: group.attachmentDtlTypeId ?? undefined,
          clientVisible: getClientVisible(group.attachmentDtlTypeId),
          displayOrder:
            groups.value.find(
              (item) => item.attachmentDtlTypeId === group.attachmentDtlTypeId,
            )?.items.length ?? 0,
          url: uploaded.url,
        },
      ],
    });

    message.success($t('seaImport.import.attachments.uploadSuccess'));
    await loadAttachments();
  } catch (error) {
    console.error('上传附件失败:', error);
    message.error($t('seaImport.import.attachments.uploadFailed'));
  } finally {
    uploadingTypeId.value = undefined;
  }

  return false;
};

const isDragOver = (typeId: number | null) =>
  dragOverTypeId.value !== undefined && dragOverTypeId.value === typeId;

const onDragEnter = (group: AttachmentTypeGroup, event: DragEvent) => {
  if (!canEdit.value) return;
  if (!event.dataTransfer?.types?.includes('Files')) return;
  dragOverTypeId.value = group.attachmentDtlTypeId;
};

const onDragOver = (group: AttachmentTypeGroup, event: DragEvent) => {
  if (!canEdit.value) return;
  if (!event.dataTransfer?.types?.includes('Files')) return;
  event.dataTransfer.dropEffect = 'copy';
  dragOverTypeId.value = group.attachmentDtlTypeId;
};

const onDragLeave = (group: AttachmentTypeGroup, event: DragEvent) => {
  const current = event.currentTarget as HTMLElement | null;
  const related = event.relatedTarget as Node | null;
  if (current && related && current.contains(related)) return;
  if (isDragOver(group.attachmentDtlTypeId)) {
    dragOverTypeId.value = undefined;
  }
};

const onDrop = async (group: AttachmentTypeGroup, event: DragEvent) => {
  dragOverTypeId.value = undefined;
  if (!canEdit.value) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) return;
  for (const file of files) {
    await handleBeforeUpload(file as unknown as UploadFile, group);
  }
};

const handleDownload = (row: SeaImportAdminApi.AttachmentItemDto) => {
  const url = row.url ? buildAttachmentUrl(row.url) : '';
  if (!url) {
    message.warning($t('seaImport.import.attachments.noFileUrl'));
    return;
  }
  window.open(url, '_blank');
};

const handleDelete = (row: SeaImportAdminApi.AttachmentItemDto) => {
  if (!canEdit.value || !seaImportId.value) return;

  const fileName =
    row.friendlyFileName?.split('/').pop() ||
    $t('system.basicData.attachmentFallback');

  Modal.confirm({
    title: $t('common.confirmDelete', [
      $t('seaImport.import.attachments.title'),
    ]),
    content: $t('seaImport.import.attachments.deleteConfirm', [fileName]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteSeaImportAttachments({
          id: seaImportId.value,
          attachmentIds: [row.attachmentId],
        });
        message.success($t('seaImport.import.attachments.deleteSuccess'));
        await loadAttachments();
      } catch (error) {
        console.error('删除附件失败:', error);
        message.error($t('seaImport.import.attachments.deleteFailed'));
      }
    },
  });
};

const getFileName = (row: SeaImportAdminApi.AttachmentItemDto): string => {
  const name = row.friendlyFileName || row.url || '';
  return name.split('/').pop() || $t('system.basicData.attachmentFallback');
};

const getFileExtension = (row: SeaImportAdminApi.AttachmentItemDto): string => {
  const source = row.friendlyFileName || row.url || '';
  const match = source.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match?.[1] ? match[1].toLowerCase() : '';
};

const isImageFile = (row: SeaImportAdminApi.AttachmentItemDto): boolean =>
  IMAGE_EXTENSIONS.has(getFileExtension(row));

const getFileIcon = (row: SeaImportAdminApi.AttachmentItemDto): string => {
  const ext = getFileExtension(row);
  if (ext === 'pdf') return 'mdi:file-pdf-box';
  if (['doc', 'docx'].includes(ext)) return 'mdi:file-word-box';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'mdi:file-excel-box';
  if (['ppt', 'pptx'].includes(ext)) return 'mdi:file-powerpoint-box';
  if (['rar', 'zip'].includes(ext)) return 'mdi:folder-zip-outline';
  if (IMAGE_EXTENSIONS.has(ext)) return 'mdi:file-image-outline';
  return 'mdi:file-document-outline';
};

const getFileIconColor = (row: SeaImportAdminApi.AttachmentItemDto): string => {
  const ext = getFileExtension(row);
  if (ext === 'pdf') return '#e5252a';
  if (['doc', 'docx'].includes(ext)) return '#2b579a';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return '#217346';
  if (['ppt', 'pptx'].includes(ext)) return '#d24726';
  if (IMAGE_EXTENSIONS.has(ext)) return '#8b5cf6';
  return '#8c8c8c';
};

const handlePreview = (row: SeaImportAdminApi.AttachmentItemDto) => {
  if (!row.url) {
    message.warning($t('seaImport.import.attachments.noFileUrl'));
    return;
  }
  openAttachmentViewer({
    url: row.url,
    fileName: getFileName(row),
    uploader: row.creatorUserName,
    creationTime: row.creationTime,
  });
};

onMounted(() => {
  loadAttachments();
});
</script>

<template>
  <div class="sea-import-attachments p-4">
    <Spin :spinning="loading">
      <div v-if="groups.length === 0 && !loading" class="py-12">
        <Empty :description="$t('seaImport.import.attachments.empty')">
          <Button
            v-if="canEdit && availableOtherTypes.length > 0"
            type="primary"
            @click="openAddOtherTypeModal"
          >
            {{ $t('seaImport.import.attachments.addOtherType') }}
          </Button>
        </Empty>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          v-for="group in groups"
          :key="getGroupKey(group.attachmentDtlTypeId)"
          size="small"
          class="attachment-card"
          :class="{
            'attachment-card--droppable': canEdit,
            'attachment-card--drag-over': isDragOver(group.attachmentDtlTypeId),
          }"
          @dragenter.prevent="onDragEnter(group, $event)"
          @dragover.prevent="onDragOver(group, $event)"
          @dragleave="onDragLeave(group, $event)"
          @drop.prevent="onDrop(group, $event)"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <span class="truncate font-medium" :title="group.name">
                {{ group.name }}
              </span>
              <span class="text-xs font-normal text-gray-400">
                {{
                  $t('seaImport.import.attachments.fileCount', [
                    group.items.length,
                  ])
                }}
              </span>
            </div>
          </template>

          <template v-if="canEdit" #extra>
            <div class="flex items-center gap-3">
              <Checkbox
                :checked="getGroupVisibleChecked(group)"
                :indeterminate="getGroupVisibleIndeterminate(group)"
                :disabled="isGroupVisibilityUpdating(group)"
                @update:checked="
                  (value) => handleGroupVisibleChange(group, !!value)
                "
              >
                <span class="text-xs">
                  {{ $t('seaImport.import.attachments.clientVisible') }}
                </span>
              </Checkbox>

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
                  {{ $t('seaImport.import.attachments.upload') }}
                </Button>
              </Upload>
            </div>
          </template>

          <div class="attachment-card-list">
            <div
              v-if="group.items.length === 0"
              class="py-6 text-center text-xs text-gray-400"
            >
              {{
                canEdit
                  ? $t('seaImport.import.attachments.clickOrDragUpload')
                  : $t('seaImport.import.attachments.emptyType')
              }}
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
                        ? `${$t('seaImport.import.attachments.uploader')}：${item.creatorUserName}`
                        : '',
                      item.creationTime
                        ? `${$t('seaImport.import.attachments.uploadTime')}：${formatDateTime(item.creationTime)}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  "
                >
                  <span>{{ formatFileSize(item.fileLength) }}</span>
                  <span v-if="item.creatorUserName">
                    {{ $t('seaImport.import.attachments.uploader') }}：{{
                      item.creatorUserName
                    }}
                  </span>
                  <span v-if="item.creationTime">
                    {{ $t('seaImport.import.attachments.uploadTime') }}：{{
                      formatDateTime(item.creationTime)
                    }}
                  </span>
                </div>
              </div>

              <span v-if="canEdit" class="shrink-0" @click.stop>
                <Tooltip
                  :title="
                    item.clientVisible
                      ? $t('seaImport.import.attachments.clientVisibleTip')
                      : $t('seaImport.import.attachments.clientInvisibleTip')
                  "
                >
                  <Switch
                    size="small"
                    :checked="!!item.clientVisible"
                    :loading="isItemVisibilityUpdating(item)"
                    @change="
                      (checked) => handleItemVisibleChange(item, !!checked)
                    "
                  />
                </Tooltip>
              </span>

              <div class="attachment-file-actions" @click.stop>
                <Tooltip :title="$t('seaImport.import.attachments.preview')">
                  <Button type="text" size="small" @click="handlePreview(item)">
                    <IconifyIcon icon="mdi:eye-outline" />
                  </Button>
                </Tooltip>
                <Tooltip :title="$t('seaImport.import.attachments.download')">
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
            {{ $t('seaImport.import.attachments.addOtherType') }}
          </span>
        </button>
      </div>
    </Spin>

    <Modal
      v-model:open="addOtherTypeVisible"
      :title="$t('seaImport.import.attachments.addOtherType')"
      :ok-text="$t('common.confirm')"
      :cancel-text="$t('common.cancel')"
      @ok="confirmAddOtherType"
    >
      <div class="py-2">
        <div class="mb-2 text-sm text-gray-600">
          {{ $t('seaImport.import.attachments.addOtherTypeTip') }}
        </div>
        <Select
          v-model:value="selectedOtherTypeId"
          :options="otherTypeOptions"
          :placeholder="
            $t('seaImport.import.attachments.selectTypePlaceholder')
          "
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

.attachment-card--droppable {
  cursor: default;
}

.attachment-card.attachment-card--drag-over {
  background: #f0f9ff;
  border-color: #3b82f6;
  border-style: dashed;
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
