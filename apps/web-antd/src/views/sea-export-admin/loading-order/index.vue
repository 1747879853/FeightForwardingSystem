<script lang="ts" setup>
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { AttachmentDtlTypeApi } from '#/api/system/attachment-dtl-type';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { Copy, IconifyIcon } from '@vben/icons';

import dayjs from 'dayjs';

import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Spin,
  Table,
  Tooltip,
  Upload,
} from 'ant-design-vue';

import UserSelect from '#/adapter/component/biz-select/user-select.vue';
import { mapResultToAttachment, uploadFile } from '#/api/common/upload';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import {
  addLoadingOrder,
  deleteLoadingOrder,
  editLoadingOrder,
  editOrderCtnAttachmentGroups,
  getLoadingOrderBySeaExportId,
  LOADING_ORDER_STATUS_TEXT,
  LoadingOrderStatus,
  ORDER_CTN_LOADING_MODULE_TYPE,
  submitLoadingOrder,
  withdrawLoadingOrder,
} from '#/api/sea-export/loading-order-admin';
import { getAttachmentDtlTypesByModuleTypes } from '#/api/system/attachment-dtl-type';
import { getCarrierDetail } from '#/api/system/base-data/carrier-admin';
import { getCodePackageDetail } from '#/api/system/base-data/code-package-admin';
import { getLoadingRequirementPagedList } from '#/api/system/base-data/loading-requirement-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { useKeepAliveRouteParamId } from '#/composables/use-keep-alive-route-param-id';
import { $t } from '#/locales';
import { buildAttachmentUrl } from '#/utils';

import cameraIcon from './assets/camera.svg';
import tagCloseIcon from './assets/tag-close.svg';
import RecommendModal from './recommend-modal.vue';

defineOptions({
  name: 'SeaExportLoadingOrder',
});

const { hasAccessByCodes } = useAccess();
const router = useRouter();

const seaExportIdRef = useKeepAliveRouteParamId();
const seaExportId = computed(() => seaExportIdRef.value ?? '');

const canAdd = computed(() =>
  hasAccessByCodes(['Admin.SeaExport.LoadingOrder.Add']),
);
const canEdit = computed(() =>
  hasAccessByCodes(['Admin.SeaExport.LoadingOrder.Edit']),
);
const canDelete = computed(() =>
  hasAccessByCodes(['Admin.SeaExport.LoadingOrder.Delete']),
);

const loading = ref(false);
const saving = ref(false);
const detail = ref<LoadingOrderAdminApi.LoadingOrderDetailDto | null>(null);
/** 未提交态下的本地编辑草稿；null 表示未进入编辑 */
const editing = ref(false);
const seaExportDetail = ref<null | SeaExportAdminApi.SeaExportDto>(null);
/** 新建尚未落库时，从基础数据拉全量监装要求做勾选树 */
const catalogRequirements = ref<
  LoadingOrderAdminApi.LoadingOrderRequirementDto[]
>([]);
const activeRequirementId = ref<string>('');
const photoPreviewOpen = ref(false);
const photoPreviewUrls = ref<string[]>([]);
const photoPreviewIndex = ref(0);
const recommendOpen = ref(false);

const isEmptyBizId = (id: unknown) => {
  if (id == null || id === '') return true;
  const text = String(id);
  return text === '0' || text === '00000000-0000-0000-0000-000000000000';
};

// ── 照片编辑弹窗 ──────────────────────────────────────────────────
/** 当前正在编辑照片的箱 */
const photoEditCtn = ref<LoadingOrderAdminApi.LoadingOrderCtnDto | null>(null);
const photoEditOpen = ref(false);
const photoEditUploading = ref(false);
const photoEditSaving = ref(false);
const attachmentTypes = ref<AttachmentDtlTypeApi.AttachmentDtlTypeSimpleDto[]>(
  [],
);

type EditablePhoto = {
  id?: number | string;
  attachmentId: number | string;
  url: string;
  clientVisible?: boolean;
  displayOrder?: number;
};

type EditableGroup = {
  attachmentDtlTypeId: null | number | string;
  typeName: string;
  items: EditablePhoto[];
};

const photoEditGroups = ref<EditableGroup[]>([]);

const DEFAULT_PHOTO_GROUP_NAME = '监装照片';

function typeIdKey(id: null | number | string | undefined) {
  if (id == null || id === '') return 'null';
  return String(id);
}

function resolveExistingTypeName(
  group: NonNullable<
    LoadingOrderAdminApi.LoadingOrderCtnDto['attachmentGroups']
  >[number],
) {
  return (
    group.attachmentDtlType?.name ||
    group.attachmentDtlType?.typeName ||
    DEFAULT_PHOTO_GROUP_NAME
  );
}

/** 先铺维护的附件类型空槽，再填该箱已有照片；历史未分类组追加在后 */
function toEditableGroups(ctn: LoadingOrderAdminApi.LoadingOrderCtnDto) {
  const existing = ctn.attachmentGroups ?? [];
  const itemsByType = new Map<string, EditablePhoto[]>();

  for (const group of existing) {
    itemsByType.set(
      typeIdKey(group.attachmentDtlTypeId),
      (group.items ?? []).map((item) => ({
        id: item.id,
        attachmentId: item.attachmentId!,
        url: buildAttachmentUrl(item.url),
        clientVisible: item.clientVisible,
        displayOrder: item.displayOrder,
      })),
    );
  }

  const groups: EditableGroup[] = [];
  const seen = new Set<string>();
  const sortedTypes = [...attachmentTypes.value].sort(
    (a, b) => (a.sortId ?? 0) - (b.sortId ?? 0),
  );

  for (const type of sortedTypes) {
    const key = typeIdKey(type.id);
    seen.add(key);
    groups.push({
      attachmentDtlTypeId: type.id,
      typeName: type.name || String(type.id),
      items: itemsByType.get(key) ?? [],
    });
  }

  for (const group of existing) {
    const key = typeIdKey(group.attachmentDtlTypeId);
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push({
      attachmentDtlTypeId: group.attachmentDtlTypeId ?? null,
      typeName: resolveExistingTypeName(group),
      items: itemsByType.get(key) ?? [],
    });
  }

  if (groups.length === 0) {
    groups.push({
      attachmentDtlTypeId: null,
      typeName: DEFAULT_PHOTO_GROUP_NAME,
      items: [],
    });
  }

  return groups;
}

const loadAttachmentTypes = async () => {
  try {
    const result = await getAttachmentDtlTypesByModuleTypes({
      moduleTypes: [ORDER_CTN_LOADING_MODULE_TYPE],
    });
    attachmentTypes.value = (result[0]?.attachmentDtlTypes ?? []).filter(
      (type) => type.id != null && type.id !== '',
    );
  } catch {
    attachmentTypes.value = [];
  }
};

async function openPhotoEdit(row: LoadingOrderAdminApi.LoadingOrderCtnDto) {
  if (isEmptyBizId(row.id)) {
    message.warning($t('seaExport.loadingOrder.photoNeedCtnId'));
    return;
  }
  photoEditCtn.value = row;
  await loadAttachmentTypes();
  photoEditGroups.value = toEditableGroups(row);
  photoEditOpen.value = true;
}

function buildAttachmentGroupsPayload(groups: EditableGroup[]) {
  return groups
    .map((g) => ({
      attachmentDtlTypeId: g.attachmentDtlTypeId,
      items: g.items.map((photo, idx) => ({
        attachmentId: photo.attachmentId,
        attachmentDtlTypeId: g.attachmentDtlTypeId,
        clientVisible: photo.clientVisible,
        displayOrder: idx,
      })),
    }))
    .filter((g) => g.items.length > 0);
}

function removePhotoFromGroup(groupIndex: number, photoIndex: number) {
  if (!canEdit.value) return;
  photoEditGroups.value[groupIndex]?.items.splice(photoIndex, 1);
}

async function handlePhotoUpload(file: unknown, groupIndex: number) {
  if (!canEdit.value) return false;
  photoEditUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file as File);
    const results = await uploadFile(formData);
    const uploaded = results[0];
    if (!uploaded) throw new Error('上传返回为空');
    const attachment = mapResultToAttachment(uploaded);
    photoEditGroups.value[groupIndex]?.items.push({
      attachmentId: attachment.attachmentId,
      url: buildAttachmentUrl(attachment.url),
    });
  } catch (error) {
    message.error(error instanceof Error ? error.message : '上传失败');
  } finally {
    photoEditUploading.value = false;
  }
  return false; // 阻止 antd Upload 默认行为
}

async function savePhotoEdit() {
  const ctn = photoEditCtn.value;
  if (!ctn || isEmptyBizId(ctn.id) || !canEdit.value) return;

  photoEditSaving.value = true;
  try {
    await editOrderCtnAttachmentGroups({
      id: ctn.id,
      attachmentGroups: buildAttachmentGroupsPayload(photoEditGroups.value),
    });
    message.success($t('seaExport.loadingOrder.photoSaveSuccess'));
    photoEditOpen.value = false;
    if (!seaExportId.value) return;
    const result = await getLoadingOrderBySeaExportId(seaExportId.value);
    if (result) detail.value = result;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    photoEditSaving.value = false;
  }
}
/** 推荐弹窗回填的师傅，补进 UserSelect selectedItems */
const extraSupervisors = ref<SystemUserAdminApi.UserSimpleDto[]>([]);

const ctnTypeName = (ctnCode?: null | { ctnName?: string; name?: string }) =>
  ctnCode?.name || ctnCode?.ctnName || '-';

const form = ref<{
  carrierYardId: string | undefined;
  codePackageItemId: string | undefined;
  estimatedArrivalTime: string | undefined;
  pkgs: number | undefined;
  remark: string;
  requirementItemIds: string[];
  userIds: (number | string)[];
}>({
  carrierYardId: undefined,
  codePackageItemId: undefined,
  estimatedArrivalTime: undefined,
  pkgs: undefined,
  remark: '',
  requirementItemIds: [],
  userIds: [],
});

/**
 * 明细包装 / 堆场的候选项只认**已保存**的海运出口：
 * 后端按库里那票校验，跟随未保存的基础信息会导致提交被打回。
 */
const packageItems = ref<CodePackageAdminApi.CodePackageItemDto[]>([]);
const carrierYards = ref<CarrierAdminApi.CarrierYardDto[]>([]);
const savedPackageName = ref<string>('');
const savedCarrierId = ref('');
const savedCarrierName = ref<string>('');
/** KeepAlive 首次挂载由 onMounted 拉详情，之后切回 Tab 只刷新主单下拉 */
const hasLoadedOnce = ref(false);

const resolveSavedCarrierId = (
  seaExport: null | SeaExportAdminApi.SeaExportDto,
) => {
  const id = seaExport?.carrierId ?? seaExport?.carrier?.id;
  return isEmptyBizId(id) ? '' : String(id);
};

const status = computed(() => detail.value?.status);
const isUnsubmitted = computed(
  () => status.value === LoadingOrderStatus.Unsubmitted,
);
const isPending = computed(() => status.value === LoadingOrderStatus.Pending);
const isLocked = computed(
  () =>
    status.value === LoadingOrderStatus.Claimed ||
    status.value === LoadingOrderStatus.Completed,
);

const statusMeta = computed(() => {
  if (!detail.value) {
    return {
      tone: 'draft',
      icon: 'lucide:file-plus-2',
      label: $t('seaExport.loadingOrder.statusNew'),
      hint: $t('seaExport.loadingOrder.statusHintNew'),
    };
  }

  const label = LOADING_ORDER_STATUS_TEXT[detail.value.status] ?? '-';
  switch (detail.value.status) {
    case LoadingOrderStatus.Pending: {
      return {
        tone: 'pending',
        icon: 'lucide:clock-3',
        label,
        hint: $t('seaExport.loadingOrder.statusHintPending'),
      };
    }
    case LoadingOrderStatus.Claimed: {
      return {
        tone: 'claimed',
        icon: 'lucide:user-check',
        label,
        hint: $t('seaExport.loadingOrder.statusHintClaimed'),
      };
    }
    case LoadingOrderStatus.Completed: {
      return {
        tone: 'completed',
        icon: 'lucide:circle-check-big',
        label,
        hint: $t('seaExport.loadingOrder.statusHintCompleted'),
      };
    }
    default: {
      return {
        tone: 'unsubmitted',
        icon: 'lucide:file-pen-line',
        label,
        hint: $t('seaExport.loadingOrder.statusHintUnsubmitted'),
      };
    }
  }
});

/** 未提交工单或新建草稿始终可改，对齐稿面「保存 / 提交 / 删除」同栏 */
const isFormEditable = computed(() => {
  if (!detail.value) return editing.value;
  return isUnsubmitted.value && canEdit.value;
});

const packageDisabled = computed(() => packageItems.value.length === 0);
const yardEmptyText = computed(() => {
  if (carrierYards.value.length > 0) return undefined;
  if (!savedCarrierId.value) {
    return $t('seaExport.loadingOrder.carrierMissing');
  }
  return $t('seaExport.loadingOrder.yardEmpty', [
    savedCarrierName.value || savedCarrierId.value,
  ]);
});
const yardPlaceholder = computed(
  () => yardEmptyText.value || $t('ui.placeholder.select'),
);

const packageOptions = computed(() =>
  packageItems.value.map((item) => ({
    label: item.name,
    value: String(item.id),
  })),
);

const yardOptions = computed(() =>
  carrierYards.value.map((yard) => ({
    label: yard.address ? `${yard.name}（${yard.address}）` : yard.name,
    value: String(yard.id),
  })),
);

const supervisorSelectedItems = computed(() => {
  const byId = new Map<string, SystemUserAdminApi.UserSimpleDto>();
  for (const row of detail.value?.loadingOrderUsers ?? []) {
    const user = row.user;
    if (!user) continue;
    byId.set(String(user.id), {
      id: user.id,
      nickName: user.nickName ?? '',
      enName: user.enName,
      employeeID: user.employeeID,
      userAttribute: user.userAttribute,
    });
  }
  for (const user of extraSupervisors.value) {
    byId.set(String(user.id), user);
  }
  return form.value.userIds
    .map((id) => byId.get(String(id)))
    .filter((user): user is SystemUserAdminApi.UserSimpleDto => Boolean(user));
});

const displayMblNum = computed(
  () =>
    detail.value?.seaExport?.mblNum ||
    seaExportDetail.value?.transportOrder?.mblNum ||
    '',
);

const displayVesselVoyage = computed(() => {
  const vessel =
    detail.value?.seaExport?.vessel || seaExportDetail.value?.vessel;
  const voyage =
    detail.value?.seaExport?.innerVoyno || seaExportDetail.value?.innerVoyno;
  return [vessel, voyage].filter(Boolean).join(' / ');
});

const displayGoods = computed(() => {
  const fromOrder = (detail.value?.seaExport?.codeGoodss ?? [])
    .map((item) => item.name)
    .filter(Boolean);
  if (fromOrder.length > 0) return fromOrder.join('、');
  return (
    (seaExportDetail.value?.transportOrder?.orderCodeGoodss ?? [])
      .map((item) => item.codeGoods?.name)
      .filter(Boolean)
      .join('、') || ''
  );
});

const displayKgs = computed(() => {
  const kgs =
    detail.value?.seaExport?.kgs ?? seaExportDetail.value?.transportOrder?.kgs;
  return kgs == null ? '' : String(kgs);
});

const displayMainPkgs = computed(() => {
  const pkgs =
    detail.value?.seaExport?.pkgs ??
    seaExportDetail.value?.transportOrder?.pkgs;
  return pkgs == null ? '' : String(pkgs);
});

const displayPackageName = computed(
  () =>
    detail.value?.seaExport?.codePackage?.name ||
    seaExportDetail.value?.transportOrder?.codePackage?.name ||
    savedPackageName.value ||
    '',
);

const displayCtnQty = computed(() => {
  const rows =
    (detail.value?.orderCtns?.length ? detail.value.orderCtns : null) ??
    seaExportDetail.value?.transportOrder?.orderCtns ??
    [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = ctnTypeName(row.ctnCode);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (counts.size > 0) {
    return [...counts.entries()]
      .map(([name, count]) => `${name}*${count}`)
      .join(' ');
  }
  return seaExportDetail.value?.transportOrder?.totalCtn || '';
});

const orderCtns = computed(() => {
  if (detail.value?.orderCtns?.length) return detail.value.orderCtns;
  return (seaExportDetail.value?.transportOrder?.orderCtns ?? []).map(
    (row) =>
      ({
        id: row.id ?? '',
        ctnCodeId: row.ctnCodeId,
        ctnCode: row.ctnCode
          ? {
              id: row.ctnCode.id,
              name: row.ctnCode.ctnName,
              ctnName: row.ctnCode.ctnName,
            }
          : null,
        ctnNo: row.ctnNo,
        sealNo: row.sealNo,
        isLoadingCompleted: false,
        attachmentGroups: [],
      }) as LoadingOrderAdminApi.LoadingOrderCtnDto,
  );
});

const requirements = computed(() => {
  if (detail.value?.loadingRequirements?.length) {
    return detail.value.loadingRequirements;
  }
  return catalogRequirements.value;
});

const activeRequirement = computed(
  () =>
    requirements.value.find(
      (group) => String(group.id) === String(activeRequirementId.value),
    ) ?? requirements.value[0],
);

const selectedRequirementItems = computed(() => {
  const ids = new Set(form.value.requirementItemIds.map(String));
  return requirements.value.flatMap((group) =>
    (group.loadingRequirementItems ?? []).filter((item) =>
      ids.has(String(item.id)),
    ),
  );
});

const onPhotoPreviewVisibleChange = (visible: boolean) => {
  photoPreviewOpen.value = visible;
};

/** 拉已保存海出的包装明细、船公司堆场，以及新建时的监装要求目录 */
const loadOptionSources = async () => {
  packageItems.value = [];
  carrierYards.value = [];
  savedPackageName.value = '';
  savedCarrierId.value = '';
  savedCarrierName.value = '';
  seaExportDetail.value = null;
  if (!seaExportId.value) return;

  const seaExport = await getSeaExportDetail(seaExportId.value);
  seaExportDetail.value = seaExport ?? null;
  const codePackageId = seaExport?.transportOrder?.codePackageId;
  const carrierId = resolveSavedCarrierId(seaExport);
  savedPackageName.value = seaExport?.transportOrder?.codePackage?.name ?? '';
  savedCarrierId.value = carrierId;
  savedCarrierName.value =
    seaExport?.carrier?.cnShortName || seaExport?.carrier?.cnName || '';

  const tasks: Promise<void>[] = [];
  if (codePackageId) {
    tasks.push(
      getCodePackageDetail(String(codePackageId))
        .then((pkg) => {
          packageItems.value = pkg?.codePackageItems ?? [];
        })
        .catch(() => {
          packageItems.value = [];
        }),
    );
  }
  if (carrierId) {
    tasks.push(
      getCarrierDetail(String(carrierId))
        .then((carrier) => {
          carrierYards.value = carrier?.carrierYards ?? [];
        })
        .catch(() => {
          carrierYards.value = [];
        }),
    );
  }
  await Promise.all(tasks);
};

const loadCatalogRequirements = async () => {
  try {
    const result = await getLoadingRequirementPagedList({
      PageIndex: 1,
      PageSize: 500,
      Sorting: 'SortId ASC',
    });
    catalogRequirements.value = (result?.items ?? []).map((group) => ({
      id: String(group.id),
      name: group.name,
      sortId: group.sortId,
      loadingRequirementItems: (group.loadingRequirementItems ?? []).map(
        (item) => ({
          id: String(item.id),
          loadingRequirementId: item.loadingRequirementId
            ? String(item.loadingRequirementId)
            : undefined,
          name: item.name,
          sortId: item.sortId,
          remark: item.remark,
          isChecked: false,
        }),
      ),
    }));
  } catch {
    catalogRequirements.value = [];
  }
};

const resetFormFromDetail = () => {
  const current = detail.value;
  form.value = {
    carrierYardId: current?.carrierYardId
      ? String(current.carrierYardId)
      : undefined,
    codePackageItemId: current?.codePackageItemId
      ? String(current.codePackageItemId)
      : undefined,
    estimatedArrivalTime: current?.estimatedArrivalTime ?? undefined,
    pkgs: current?.pkgs ?? undefined,
    remark: current?.remark ?? '',
    requirementItemIds: (current?.loadingRequirementItemIds ?? []).map(String),
    userIds: (current?.loadingOrderUsers ?? []).map((row) => row.userId),
  };
  extraSupervisors.value = [];
};

const loadDetail = async () => {
  if (!seaExportId.value) return;
  loading.value = true;
  try {
    const [result] = await Promise.all([
      getLoadingOrderBySeaExportId(seaExportId.value),
      loadOptionSources(),
      loadAttachmentTypes(),
    ]);
    detail.value = result ?? null;
    if (!result) {
      resetFormFromDetail();
      if (canAdd.value) {
        editing.value = true;
        await loadCatalogRequirements();
      } else {
        editing.value = false;
        catalogRequirements.value = [];
      }
    } else {
      editing.value = result.status === LoadingOrderStatus.Unsubmitted;
      resetFormFromDetail();
    }
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadDetail();
  hasLoadedOnce.value = true;
});
onActivated(() => {
  if (!hasLoadedOnce.value) return;
  void loadOptionSources();
  void loadAttachmentTypes();
});
watch(seaExportId, () => {
  void loadDetail();
});

watch(
  requirements,
  (groups) => {
    if (
      groups.length > 0 &&
      !groups.some(
        (group) => String(group.id) === String(activeRequirementId.value),
      )
    ) {
      activeRequirementId.value = String(groups[0]?.id ?? '');
    }
  },
  { immediate: true },
);

const onUserIdsChange = (value: unknown) => {
  form.value.userIds = Array.isArray(value) ? value : [];
};

const toggleRequirementItem = (itemId: string, checked: boolean) => {
  const set = new Set(form.value.requirementItemIds.map(String));
  if (checked) {
    set.add(String(itemId));
  } else {
    set.delete(String(itemId));
  }
  form.value.requirementItemIds = [...set];
};

const isRequirementChecked = (itemId: string) =>
  form.value.requirementItemIds.some((id) => String(id) === String(itemId));

const checkedCountOfGroup = (
  group: LoadingOrderAdminApi.LoadingOrderRequirementDto,
) =>
  (group.loadingRequirementItems ?? []).filter((item) =>
    isRequirementChecked(item.id),
  ).length;

const buildPayload = () => ({
  carrierYardId: form.value.carrierYardId ?? null,
  codePackageItemId: form.value.codePackageItemId ?? null,
  estimatedArrivalTime: form.value.estimatedArrivalTime ?? null,
  pkgs: form.value.pkgs ?? null,
  remark: form.value.remark.trim() || null,
  // 全量提交：漏传等于清空
  loadingRequirementItemIds: form.value.requirementItemIds.map(String),
  userIds: form.value.userIds,
});

const handleSave = async () => {
  saving.value = true;
  try {
    if (detail.value?.id) {
      await editLoadingOrder({ id: detail.value.id, ...buildPayload() });
    } else {
      const id = await addLoadingOrder({
        seaExportId: seaExportId.value,
        ...buildPayload(),
      });
      // 详情接口若随后失败，仍要记住工单 id，避免第二次保存再走新建
      if (id) {
        detail.value = {
          id: String(id),
          seaExportId: seaExportId.value,
          status: LoadingOrderStatus.Unsubmitted,
        } as LoadingOrderAdminApi.LoadingOrderDetailDto;
      }
    }
    message.success($t('ui.actionMessage.operationSuccess'));
    await loadDetail();
  } finally {
    saving.value = false;
  }
};

const handleDelete = () => {
  const id = detail.value?.id;
  if (!id) return;
  Modal.confirm({
    title: $t('seaExport.loadingOrder.deleteConfirm'),
    okType: 'danger',
    onOk: async () => {
      await deleteLoadingOrder(id);
      message.success($t('ui.actionMessage.deleteSuccess', ['']));
      await loadDetail();
    },
  });
};

const handleSubmit = () => {
  const id = detail.value?.id;
  if (!id) return;
  Modal.confirm({
    title: $t('seaExport.loadingOrder.submitConfirm'),
    onOk: async () => {
      await submitLoadingOrder(id);
      message.success($t('ui.actionMessage.operationSuccess'));
      await loadDetail();
    },
  });
};

const handleWithdraw = () => {
  const id = detail.value?.id;
  if (!id) return;
  Modal.confirm({
    title: $t('seaExport.loadingOrder.withdrawConfirm'),
    onOk: async () => {
      await withdrawLoadingOrder(id);
      message.success($t('ui.actionMessage.operationSuccess'));
      await loadDetail();
    },
  });
};

const arrivalTimeValue = computed(() =>
  form.value.estimatedArrivalTime &&
  dayjs(form.value.estimatedArrivalTime).isValid()
    ? dayjs(form.value.estimatedArrivalTime)
    : undefined,
);

const onArrivalTimeChange = (value: unknown) => {
  if (!value) {
    form.value.estimatedArrivalTime = undefined;
    return;
  }
  const parsed = dayjs(value as Date);
  form.value.estimatedArrivalTime = parsed.isValid()
    ? parsed.toISOString()
    : undefined;
};

const recommendArrivalDate = computed(() =>
  arrivalTimeValue.value
    ? arrivalTimeValue.value.format('YYYY-MM-DD')
    : undefined,
);

const openRecommendModal = () => {
  if (!isFormEditable.value) return;
  if (!savedCarrierId.value) {
    message.warning($t('seaExport.loadingOrder.carrierMissing'));
    return;
  }
  if (!recommendArrivalDate.value) {
    message.warning($t('seaExport.loadingOrder.recommendNeedArrival'));
    return;
  }
  recommendOpen.value = true;
};

const onRecommendConfirm = (payload: {
  carrierYardId: string;
  userIds: (number | string)[];
  users: SystemUserAdminApi.UserSimpleDto[];
}) => {
  form.value.carrierYardId = payload.carrierYardId;
  form.value.userIds = payload.userIds;
  extraSupervisors.value = payload.users;
  message.success($t('seaExport.loadingOrder.recommendFilled'));
};

const collectCtnPhotos = (row: LoadingOrderAdminApi.LoadingOrderCtnDto) =>
  (row.attachmentGroups ?? []).flatMap((group) =>
    (group.items ?? [])
      .map((item) => ({
        url: buildAttachmentUrl(item.url),
        name: item.friendlyFileName || '',
      }))
      .filter((item) => Boolean(item.url)),
  );

const formatCtnAttachmentCount = (
  row: LoadingOrderAdminApi.LoadingOrderCtnDto,
) => collectCtnPhotos(row).length;

const openCtnPhotos = (row: LoadingOrderAdminApi.LoadingOrderCtnDto) => {
  const photos = collectCtnPhotos(row);
  if (photos.length === 0) {
    message.info($t('seaExport.loadingOrder.photoEmpty'));
    return;
  }
  photoPreviewUrls.value = photos.map((item) => item.url);
  photoPreviewIndex.value = 0;
  photoPreviewOpen.value = true;
};

const onPhotoBtnClick = (row: LoadingOrderAdminApi.LoadingOrderCtnDto) => {
  if (canEdit.value) {
    void openPhotoEdit(row);
    return;
  }
  openCtnPhotos(row);
};

const copyLoadingOrderNum = async () => {
  const num = detail.value?.loadingOrderNum;
  if (!num) return;
  try {
    await navigator.clipboard.writeText(num);
    message.success($t('seaExport.loadingOrder.copySuccess'));
  } catch {
    message.error($t('seaExport.loadingOrder.copyFailed'));
  }
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.append(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  }
};

const canShare = computed(() => Boolean(detail.value?.loadingOrderNum));

const copyShareUrl = async () => {
  const orderNum = detail.value?.loadingOrderNum?.trim();
  const mbl = String(displayMblNum.value || '').trim();
  if (!orderNum) {
    message.warning($t('seaExport.loadingOrder.shareNeedOrderNum'));
    return;
  }
  if (!mbl) {
    message.warning($t('seaExport.loadingOrder.shareNeedMbl'));
    return;
  }
  const { href } = router.resolve({
    name: 'LoadingOrderSharePage',
    query: {
      mblNum: mbl,
      loadingOrderNum: orderNum,
    },
  });
  const url = `${window.location.origin}${href}`;
  const ok = await copyText(url);
  if (ok) {
    message.success($t('seaExport.loadingOrder.shareCopied'));
  } else {
    message.error($t('seaExport.loadingOrder.shareFailed'));
  }
};

const displayValue = (value: null | number | string | undefined) => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  return String(value);
};
</script>

<template>
  <div class="loading-order">
    <Spin :spinning="loading">
      <div v-if="!detail && !editing" class="loading-order__empty">
        <Empty :description="$t('seaExport.loadingOrder.emptyTip')" />
      </div>

      <template v-else>
        <div class="loading-order__toolbar">
          <div
            class="loading-order__status-summary"
            :class="`is-${statusMeta.tone}`"
          >
            <span class="loading-order__status-icon" aria-hidden="true">
              <IconifyIcon :icon="statusMeta.icon" />
            </span>
            <div class="loading-order__status-copy">
              <span class="loading-order__status-title">
                {{ $t('seaExport.loadingOrder.statusTitle') }}
              </span>
              <div class="loading-order__status-line">
                <strong>{{ statusMeta.label }}</strong>
                <span>{{ statusMeta.hint }}</span>
              </div>
            </div>
          </div>

          <div class="loading-order__actions">
            <Tooltip
              v-if="canShare"
              :title="$t('seaExport.loadingOrder.shareTip')"
            >
              <Button
                class="loading-order__action-button"
                @click="copyShareUrl"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:share-2" />
                </template>
                {{ $t('seaExport.loadingOrder.share') }}
              </Button>
            </Tooltip>
            <template v-if="!detail && editing">
              <Button
                v-if="canAdd"
                type="primary"
                :loading="saving"
                class="loading-order__action-button"
                @click="handleSave"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:save" />
                </template>
                {{ $t('common.save') }}
              </Button>
            </template>
            <template v-else-if="isUnsubmitted">
              <Button
                v-if="canDelete"
                type="text"
                danger
                class="loading-order__action-button"
                @click="handleDelete"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:trash-2" />
                </template>
                {{ $t('common.delete') }}
              </Button>
              <span
                v-if="canDelete && canEdit"
                class="loading-order__action-divider"
                aria-hidden="true"
              />
              <Button
                v-if="canEdit"
                type="primary"
                :loading="saving"
                class="loading-order__action-button"
                @click="handleSave"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:save" />
                </template>
                {{ $t('common.save') }}
              </Button>
              <Button
                v-if="canEdit"
                class="loading-order__action-button"
                @click="handleSubmit"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:send" />
                </template>
                {{ $t('seaExport.loadingOrder.submit') }}
              </Button>
            </template>
            <template v-else-if="isPending">
              <Button
                v-if="canEdit"
                class="loading-order__action-button"
                @click="handleWithdraw"
              >
                <template #icon>
                  <IconifyIcon icon="lucide:undo-2" />
                </template>
                {{ $t('seaExport.loadingOrder.withdraw') }}
              </Button>
            </template>
            <Tooltip
              v-else-if="isLocked"
              :title="$t('seaExport.loadingOrder.lockedTip')"
            >
              <Button disabled class="loading-order__action-button">
                <template #icon>
                  <IconifyIcon icon="lucide:lock-keyhole" />
                </template>
                {{ $t('common.edit') }}
              </Button>
            </Tooltip>
          </div>
        </div>

        <section class="loading-order__card">
          <div class="loading-order__grid">
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.loadingOrderNum') }}
              </div>
              <Input
                readonly
                :value="detail?.loadingOrderNum"
                :placeholder="$t('seaExport.loadingOrder.autoGenerated')"
              >
                <template v-if="detail?.loadingOrderNum" #suffix>
                  <Copy
                    class="loading-order__input-copy"
                    @click="copyLoadingOrderNum"
                  />
                </template>
              </Input>
            </div>
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.mblNum') }}
              </div>
              <Input
                readonly
                :value="displayValue(displayMblNum)"
                :placeholder="$t('seaExport.loadingOrder.fromMaster')"
              />
            </div>
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.vesselVoyage') }}
              </div>
              <Input
                readonly
                :value="displayValue(displayVesselVoyage)"
                :placeholder="$t('seaExport.loadingOrder.fromMaster')"
              />
            </div>
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.ctnQty') }}
              </div>
              <Input
                readonly
                :value="displayValue(displayCtnQty)"
                :placeholder="$t('seaExport.loadingOrder.fromMaster')"
              />
            </div>
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.goods') }}
              </div>
              <Input
                readonly
                :value="displayValue(displayGoods)"
                :placeholder="$t('seaExport.loadingOrder.fromMaster')"
              />
            </div>
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.kgs') }}
              </div>
              <Input
                readonly
                :value="displayValue(displayKgs)"
                :placeholder="$t('seaExport.loadingOrder.fromMaster')"
              />
            </div>
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.mainPkgs') }}
              </div>
              <Input
                readonly
                :value="displayValue(displayMainPkgs)"
                :placeholder="$t('seaExport.loadingOrder.fromMaster')"
              />
            </div>
            <div class="loading-order__field loading-order__field--readonly">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.package') }}
              </div>
              <Input
                readonly
                :value="displayValue(displayPackageName)"
                :placeholder="$t('seaExport.loadingOrder.fromMaster')"
              />
            </div>
            <div class="loading-order__field">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.codePackageItem') }}
              </div>
              <Select
                v-model:value="form.codePackageItemId"
                :options="packageOptions"
                :disabled="!isFormEditable || packageDisabled"
                :placeholder="
                  packageDisabled
                    ? $t('seaExport.loadingOrder.packageMissing')
                    : $t('ui.placeholder.select')
                "
                allow-clear
                show-search
                option-filter-prop="label"
                class="w-full"
              />
            </div>
            <div class="loading-order__field">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.pkgs') }}
              </div>
              <InputNumber
                v-model:value="form.pkgs"
                :disabled="!isFormEditable"
                :min="0"
                :precision="0"
                :controls="false"
                :placeholder="$t('ui.placeholder.input')"
                class="w-full"
              />
            </div>
            <div class="loading-order__field">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.estimatedArrivalTime') }}
              </div>
              <DatePicker
                :value="arrivalTimeValue"
                :disabled="!isFormEditable"
                show-time
                class="w-full"
                :placeholder="
                  $t('seaExport.loadingOrder.arrivalTimePlaceholder')
                "
                @change="onArrivalTimeChange"
              />
            </div>
            <div class="loading-order__field">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.carrierYard') }}
                <button
                  type="button"
                  class="loading-order__recommend"
                  :disabled="!isFormEditable"
                  @click="openRecommendModal"
                >
                  {{ $t('seaExport.loadingOrder.yardRecommend') }}
                </button>
              </div>
              <Select
                v-model:value="form.carrierYardId"
                :options="yardOptions"
                :disabled="!isFormEditable"
                :placeholder="yardPlaceholder"
                :not-found-content="yardEmptyText"
                allow-clear
                show-search
                option-filter-prop="label"
                class="w-full"
              />
            </div>
            <div class="loading-order__field loading-order__field--supervisors">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.supervisors') }}
              </div>
              <UserSelect
                :model-value="form.userIds"
                :disabled="!isFormEditable"
                :user-attribute="UserAttribute.LoadingSupervision"
                :selected-items="supervisorSelectedItems"
                :placeholder="$t('seaExport.loadingOrder.supervisorHint')"
                mode="multiple"
                max-tag-count="responsive"
                class="w-full"
                @update:model-value="onUserIdsChange"
              />
            </div>
          </div>
        </section>

        <section class="loading-order__card loading-order__card--section">
          <div class="loading-order__req-head">
            <div class="loading-order__section-title">
              {{ $t('seaExport.loadingOrder.requirements') }}
            </div>
            <div class="loading-order__section-count">
              {{ $t('seaExport.loadingOrder.selectedCountPrefix') }}
              <strong>{{ selectedRequirementItems.length }}</strong>
              {{ $t('seaExport.loadingOrder.selectedCountSuffix') }}
            </div>
          </div>

          <Empty
            v-if="requirements.length === 0"
            :description="$t('seaExport.loadingOrder.requirementEmpty')"
          />
          <template v-else>
            <div class="loading-order__tags">
              <span
                v-for="item in selectedRequirementItems"
                :key="item.id"
                class="loading-order__tag"
              >
                {{ item.name }}
                <button
                  v-if="isFormEditable"
                  type="button"
                  class="loading-order__tag-close"
                  @click="toggleRequirementItem(item.id, false)"
                >
                  <img :src="tagCloseIcon" alt="" width="8" height="8" />
                </button>
              </span>
            </div>

            <div class="loading-order__req-well">
              <div class="loading-order__tabs">
                <button
                  v-for="group in requirements"
                  :key="group.id"
                  type="button"
                  class="loading-order__tab"
                  :class="{
                    'is-active':
                      String(activeRequirement?.id) === String(group.id),
                  }"
                  @click="activeRequirementId = String(group.id)"
                >
                  <span>{{ group.name }}</span>
                  <em v-if="checkedCountOfGroup(group) > 0">
                    {{ checkedCountOfGroup(group) }}
                  </em>
                </button>
              </div>

              <div class="loading-order__checks">
                <Checkbox
                  v-for="item in activeRequirement?.loadingRequirementItems ??
                  []"
                  :key="item.id"
                  :checked="isRequirementChecked(item.id)"
                  :disabled="!isFormEditable"
                  @change="
                    (e) =>
                      toggleRequirementItem(item.id, Boolean(e.target.checked))
                  "
                >
                  {{ item.name }}
                </Checkbox>
              </div>
            </div>

            <div class="loading-order__field">
              <div class="loading-order__label">
                {{ $t('seaExport.loadingOrder.requirementRemark') }}
              </div>
              <Input.TextArea
                v-model:value="form.remark"
                :disabled="!isFormEditable"
                :maxlength="1024"
                class="loading-order__remark"
                :placeholder="
                  $t('seaExport.loadingOrder.requirementRemarkEmpty')
                "
              />
            </div>
          </template>
        </section>

        <section class="loading-order__card loading-order__card--table">
          <div class="loading-order__table-head">
            <div class="loading-order__section-title">
              {{ $t('seaExport.loadingOrder.orderCtns') }}
            </div>
            <span class="loading-order__section-hint">
              {{ $t('seaExport.loadingOrder.orderCtnsTip') }}
            </span>
          </div>
          <Table
            class="loading-order__table"
            :data-source="orderCtns"
            :pagination="false"
            size="middle"
            row-key="id"
            :scroll="{ x: 1187 }"
          >
            <Table.Column
              :title="$t('seaExport.loadingOrder.serial')"
              key="index"
              :width="93"
              align="center"
            >
              <template #default="{ index }">{{ index + 1 }}</template>
            </Table.Column>
            <Table.Column
              :title="$t('seaExport.loadingOrder.ctnCode')"
              key="ctnCode"
              :width="204"
              align="center"
            >
              <template #default="{ record }">
                {{ ctnTypeName(record.ctnCode) }}
              </template>
            </Table.Column>
            <Table.Column
              :title="$t('seaExport.loadingOrder.ctnNo')"
              data-index="ctnNo"
              :width="188"
              align="center"
            >
              <template #default="{ record }">
                {{ record.ctnNo || '-' }}
              </template>
            </Table.Column>
            <Table.Column
              :title="$t('seaExport.loadingOrder.sealNo')"
              data-index="sealNo"
              :width="183"
              align="center"
            >
              <template #default="{ record }">
                {{ record.sealNo || '-' }}
              </template>
            </Table.Column>
            <Table.Column
              :title="$t('seaExport.loadingOrder.photos')"
              key="photos"
              :width="332"
              align="center"
            >
              <template #default="{ record }">
                <button
                  type="button"
                  class="loading-order__photo-btn"
                  :class="{
                    'is-filled': formatCtnAttachmentCount(record) > 0,
                  }"
                  @click="onPhotoBtnClick(record)"
                >
                  <img
                    :src="cameraIcon"
                    alt=""
                    class="loading-order__photo-icon"
                    width="16"
                    height="16"
                  />
                  <span>
                    {{ $t('seaExport.loadingOrder.collectPhotos') }}
                    <template v-if="formatCtnAttachmentCount(record) > 0">
                      ({{ formatCtnAttachmentCount(record) }})
                    </template>
                  </span>
                </button>
              </template>
            </Table.Column>
            <Table.Column
              :title="$t('seaExport.loadingOrder.loadingStatus')"
              key="status"
              :width="187"
              align="center"
            >
              <template #default="{ record }">
                <span
                  class="loading-order__status"
                  :class="record.isLoadingCompleted ? 'is-done' : 'is-pending'"
                >
                  {{
                    record.isLoadingCompleted
                      ? $t('seaExport.loadingOrder.statusDone')
                      : $t('seaExport.loadingOrder.statusPending')
                  }}
                </span>
              </template>
            </Table.Column>
          </Table>
        </section>
      </template>
    </Spin>

    <div class="loading-order__preview-host">
      <Image.PreviewGroup
        :preview="{
          visible: photoPreviewOpen,
          current: photoPreviewIndex,
          onVisibleChange: onPhotoPreviewVisibleChange,
        }"
      >
        <Image
          v-for="(url, index) in photoPreviewUrls"
          :key="`${url}-${index}`"
          :src="url"
        />
      </Image.PreviewGroup>
    </div>

    <RecommendModal
      v-model:open="recommendOpen"
      :carrier-id="savedCarrierId"
      :estimated-arrival-date="recommendArrivalDate"
      :yards="carrierYards"
      @confirm="onRecommendConfirm"
    />

    <!-- 照片编辑弹窗 -->
    <Modal
      v-model:open="photoEditOpen"
      :title="`照片采集 — 箱号 ${photoEditCtn?.ctnNo || '--'}`"
      :footer="null"
      width="680px"
      destroy-on-close
    >
      <Spin :spinning="photoEditSaving">
        <div
          v-if="canEdit && attachmentTypes.length === 0"
          class="photo-edit-types-empty"
        >
          {{ $t('seaExport.loadingOrder.photoTypesEmpty') }}
        </div>
        <div
          v-for="(group, gi) in photoEditGroups"
          :key="String(group.attachmentDtlTypeId ?? 'untyped')"
          class="photo-edit-group"
        >
          <div class="photo-edit-group__title">{{ group.typeName }}</div>
          <div class="photo-edit-group__grid">
            <div
              v-for="(photo, pi) in group.items"
              :key="`${photo.attachmentId}-${pi}`"
              class="photo-edit-thumb"
            >
              <Image
                :src="photo.url"
                class="photo-edit-thumb__img"
                :preview="{ src: photo.url }"
              />
              <button
                v-if="canEdit"
                type="button"
                class="photo-edit-thumb__remove"
                @click="removePhotoFromGroup(gi, pi)"
              >
                ×
              </button>
            </div>
            <Upload
              v-if="canEdit"
              :show-upload-list="false"
              accept="image/*"
              :multiple="true"
              :before-upload="(file) => handlePhotoUpload(file, gi)"
              :disabled="photoEditUploading"
            >
              <div class="photo-edit-add">
                <span class="photo-edit-add__icon">{{
                  photoEditUploading ? '…' : '+'
                }}</span>
                <span class="photo-edit-add__tip">{{
                  photoEditUploading ? '上传中' : '添加图片'
                }}</span>
              </div>
            </Upload>
          </div>
        </div>
        <div class="photo-edit-footer">
          <Button @click="photoEditOpen = false">
            {{ canEdit ? '取消' : '关闭' }}
          </Button>
          <Button
            v-if="canEdit"
            type="primary"
            :loading="photoEditSaving"
            :disabled="photoEditUploading"
            @click="savePhotoEdit"
          >
            保存
          </Button>
        </div>
      </Spin>
    </Modal>
  </div>
</template>

<style scoped>
@media (max-width: 1280px) {
  .loading-order__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .loading-order__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .loading-order__toolbar {
    align-items: stretch;
  }

  .loading-order__status-summary,
  .loading-order__actions {
    width: 100%;
  }

  .loading-order__status-line span {
    overflow: visible;
    white-space: normal;
  }

  .loading-order__actions {
    flex-wrap: wrap;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid #eef1f5;
  }
}

.loading-order {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 12px;
  background: #f7fafc;
}

.loading-order :deep(.ant-spin-nested-loading),
.loading-order :deep(.ant-spin-container) {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.loading-order__empty {
  padding: 48px 0;
  background: #fff;
  border: 1px solid #e4e8ef;
  border-radius: 8px;
}

.loading-order__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 9px 12px;
  background: #fff;
  border: 1px solid #e4e8ef;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 3%);
}

.loading-order__status-summary {
  --status-color: #64748b;
  --status-soft: #f1f5f9;

  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.loading-order__status-summary.is-unsubmitted {
  --status-color: #1677ff;
  --status-soft: #eaf3ff;
}

.loading-order__status-summary.is-pending {
  --status-color: #d97706;
  --status-soft: #fff7e6;
}

.loading-order__status-summary.is-claimed {
  --status-color: #2563eb;
  --status-soft: #eff6ff;
}

.loading-order__status-summary.is-completed {
  --status-color: #16a34a;
  --status-soft: #f0fdf4;
}

.loading-order__status-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 17px;
  color: var(--status-color);
  background: var(--status-soft);
  border-radius: 8px;
}

.loading-order__status-copy {
  min-width: 0;
}

.loading-order__status-title {
  display: block;
  margin-bottom: 2px;
  font-size: 11px;
  line-height: 14px;
  color: #8c95a3;
}

.loading-order__status-line {
  display: flex;
  gap: 8px;
  align-items: baseline;
  min-width: 0;
  line-height: 18px;
}

.loading-order__status-line strong {
  flex: 0 0 auto;
  font-size: 14px;
  font-weight: 600;
  color: var(--status-color);
}

.loading-order__status-line span {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: #697586;
  white-space: nowrap;
}

.loading-order__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
}

.loading-order__action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 78px;
  height: 34px;
  border-radius: 6px;
}

.loading-order__action-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: #e4e8ef;
}

.loading-order__input-copy {
  display: inline-flex;
  color: #8c95a3;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.loading-order__input-copy:hover {
  color: #006ce6;
}

.loading-order__card {
  padding: 12px;
  background: #fff;
  border: 1px solid #e4e8ef;
  border-radius: 8px;
}

.loading-order__card--section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 276px;
  padding: 12px;
}

.loading-order__card--table {
  padding: 0 0 12px;
  overflow: hidden;
}

.loading-order__req-head,
.loading-order__table-head {
  display: flex;
  gap: 5px;
  align-items: center;
}

.loading-order__table-head {
  height: 32px;
  padding: 0 12px;
  background: rgb(218 233 255 / 50%);
}

.loading-order__section-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 17px;
  color: #252a31;
}

.loading-order__section-hint {
  font-size: 11px;
  font-weight: 400;
  line-height: 17px;
  color: #8c95a3;
}

.loading-order__section-count {
  font-size: 12px;
  line-height: 14px;
  color: #8c95a3;
}

.loading-order__section-count strong {
  font-size: 14px;
  font-weight: 600;
  color: #252a31;
}

.loading-order__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px 13px;
}

.loading-order__field {
  min-width: 0;
}

.loading-order__label {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 16px;
  margin-bottom: 1px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  color: #252a31;
}

.loading-order__recommend {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 16px;
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 12px;
  color: #fff;
  cursor: pointer;
  background: #ff9e03;
  border: 0;
  border-radius: 2px;
}

.loading-order__recommend:hover:not(:disabled) {
  background: #ffb340;
}

.loading-order__recommend:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.loading-order__field :deep(.ant-input:not(textarea)),
.loading-order__field :deep(.ant-input-affix-wrapper),
.loading-order__field
  :deep(.ant-select:not(.ant-select-multiple) .ant-select-selector),
.loading-order__field :deep(.ant-picker),
.loading-order__field :deep(.ant-input-number) {
  background: #fcfdfe;
  border-color: #e4e8ef;
  border-radius: 6px;
}

/* 稿面灰边只作用于默认态；可编辑控件 hover/focus 交回 Ant 主色 */
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-input:not(textarea):not(:disabled):hover),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-picker:not(.ant-picker-disabled):hover),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-input-number:not(.ant-input-number-disabled):hover) {
  border-color: #4096ff;
}

.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-input:not(textarea):not(:disabled):focus),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(
    .ant-input-affix-wrapper-focused:not(.ant-input-affix-wrapper-disabled)
  ),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-select-focused:not(.ant-select-disabled) .ant-select-selector),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-picker-focused:not(.ant-picker-disabled)),
.loading-order__field:not(.loading-order__field--readonly)
  :deep(.ant-input-number-focused:not(.ant-input-number-disabled)) {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(5 145 255 / 10%);
}

.loading-order__field :deep(.ant-input-number) {
  width: 100%;
}

.loading-order__field--supervisors :deep(.ant-select-selector) {
  height: auto;
  min-height: 32px;
  background: #fcfdfe;
  border-color: #e4e8ef;
  border-radius: 6px;
}

.loading-order__field--supervisors
  :deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector) {
  border-color: #4096ff;
}

.loading-order__field--supervisors
  :deep(.ant-select-focused:not(.ant-select-disabled) .ant-select-selector) {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(5 145 255 / 10%);
}

/* 主单带入 / 自动生成：禁止编辑但字色保持可读 */
.loading-order__field--readonly :deep(.ant-input-affix-wrapper),
.loading-order__field--readonly :deep(.ant-input) {
  color: #252a31;
  cursor: default;
  background: #f5f7fa;
  border-color: #e4e8ef;
}

.loading-order__field--readonly :deep(.ant-input) {
  -webkit-text-fill-color: #252a31;
  opacity: 1;
}

.loading-order__field--readonly :deep(.ant-input-affix-wrapper .ant-input) {
  background: transparent;
}

.loading-order__field--readonly :deep(.ant-input::placeholder) {
  color: #8c95a3;
  -webkit-text-fill-color: #8c95a3;
}

.loading-order__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-content: flex-start;
  min-height: 24px;
}

.loading-order__tag {
  display: inline-flex;
  gap: 9px;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  font-size: 12px;
  line-height: 12px;
  color: #252a31;
  background: #f7fafc;
  border: 1px solid #e4e8ef;
  border-radius: 2px;
}

.loading-order__tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 8px;
  height: 8px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.loading-order__req-well {
  padding: 4px 12px 12px;
  background: #f7fafc;
  border: 1px solid #e4e8ef;
  border-radius: 8px;
}

.loading-order__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  padding: 0 8px;
  margin: 0 -12px 8px;
  border-bottom: 1px solid #e4e8ef;
}

.loading-order__tab {
  display: inline-flex;
  flex-shrink: 0;
  gap: 4px;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 32px;
  color: #595959;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
}

.loading-order__tab:hover {
  color: #1677ff;
}

.loading-order__tab.is-active {
  font-weight: 600;
  color: #1677ff;
  background: transparent;
  border-bottom-color: #1677ff;
}

.loading-order__tab em {
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: 1;
  color: #fa8c16;
}

.loading-order__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  min-height: 40px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e4e8ef;
  border-radius: 4px;
}

.loading-order__checks :deep(.ant-checkbox-wrapper) {
  font-size: 12px;
  line-height: 12px;
  color: #252a31;
}

.loading-order__remark,
.loading-order__field :deep(textarea.ant-input) {
  height: 62px !important;
  min-height: 62px !important;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 20px;
  resize: none;
  background: #fcfdfe;
  border-color: #e4e8ef;
  border-radius: 5px;
}

.loading-order__field :deep(textarea.ant-input:not(:disabled):hover) {
  border-color: #4096ff;
}

.loading-order__field :deep(textarea.ant-input:not(:disabled):focus) {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgb(5 145 255 / 10%);
}

.loading-order__table {
  margin: 15px 12px 0;
}

.loading-order__table :deep(.ant-table) {
  font-size: 14px;
  color: #252a31;
}

.loading-order__table :deep(.ant-table-container) {
  border-color: #e4e8ef;
}

.loading-order__table :deep(.ant-table-thead > tr > th) {
  height: 36px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 500;
  line-height: 14px;
  text-align: center;
  background: #f7fafc;
  border-color: #e4e8ef;
}

.loading-order__table :deep(.ant-table-tbody > tr > td) {
  height: 50px;
  padding: 10px 8px;
  font-size: 14px;
  border-color: #e4e8ef;
}

.loading-order__photo-btn {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  min-width: 123px;
  height: 30px;
  padding: 0 12px;
  font-size: 14px;
  line-height: 17px;
  color: #252a31;
  white-space: nowrap;
  cursor: pointer;
  background: #f7fafc;
  border: 1px solid #e4e8ef;
  border-radius: 4px;
}

.loading-order__photo-icon {
  display: block;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.loading-order__photo-btn.is-filled {
  color: #006ce6;
  background: #edf4ff;
  border-color: #b6d8ff;
}

.loading-order__status {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 14px;
  line-height: 17px;
}

.loading-order__status::before {
  width: 6px;
  height: 6px;
  content: '';
  border-radius: 50%;
}

.loading-order__status.is-done {
  color: #32a95d;
}

.loading-order__status.is-done::before {
  background: #32a95d;
}

.loading-order__status.is-pending {
  color: #ff9e03;
}

.loading-order__status.is-pending::before {
  background: #ff9e03;
}

.loading-order__preview-host {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

/* ── 照片编辑弹窗 ── */
.photo-edit-types-empty {
  margin-bottom: 12px;
  font-size: 13px;
  color: #8b95a7;
}

.photo-edit-group {
  margin-bottom: 16px;
}

.photo-edit-group__title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #252a31;
}

.photo-edit-group__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.photo-edit-thumb {
  position: relative;
  width: 88px;
  height: 88px;
  overflow: hidden;
  border-radius: 6px;
}

.photo-edit-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.photo-edit-thumb__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 1;
  color: #fff;
  cursor: pointer;
  background: rgb(0 0 0 / 55%);
  border: none;
  border-radius: 50%;
}

.photo-edit-thumb__remove:hover {
  background: rgb(0 0 0 / 75%);
}

.photo-edit-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  cursor: pointer;
  background: #f5f7fa;
  border: 1px dashed #cfd6e0;
  border-radius: 6px;
  transition: border-color 0.2s;
}

.photo-edit-add:hover {
  border-color: #006ce6;
}

.photo-edit-add__icon {
  font-size: 24px;
  color: #8c9caf;
}

.photo-edit-add__tip {
  margin-top: 4px;
  font-size: 12px;
  color: #8c9caf;
}

.photo-edit-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid #f0f0f0;
}
</style>
