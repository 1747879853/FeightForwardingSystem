<script lang="ts" setup>
import type { LoadingOrderAdminApi } from '#/api/sea-export/loading-order-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAccess } from '@vben/access';
import { IconifyIcon } from '@vben/icons';
import { formatDateTime } from '@vben/utils';

import dayjs from 'dayjs';

import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import UserSelect from '#/adapter/component/biz-select/user-select.vue';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import {
  addLoadingOrder,
  deleteLoadingOrder,
  editLoadingOrder,
  getLoadingOrderBySeaExportId,
  LOADING_ORDER_STATUS_TEXT,
  LoadingOrderStatus,
  submitLoadingOrder,
  withdrawLoadingOrder,
} from '#/api/sea-export/loading-order-admin';
import { getCarrierDetail } from '#/api/system/base-data/carrier-admin';
import { getCodePackageDetail } from '#/api/system/base-data/code-package-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

defineOptions({
  name: 'SeaExportLoadingOrder',
});

/** 监装师傅最多两人由前端限制，后端不卡上限 */
const MAX_SUPERVISOR_COUNT = 2;

const route = useRoute();
const { hasAccessByCodes } = useAccess();

const seaExportId = computed<string>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] || '';
  return id ? String(id) : '';
});

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

const form = ref<{
  carrierYardId: string | undefined;
  codePackageItemId: string | undefined;
  estimatedArrivalTime: string | undefined;
  pkgs: number | undefined;
  requirementItemIds: string[];
  userIds: (number | string)[];
}>({
  carrierYardId: undefined,
  codePackageItemId: undefined,
  estimatedArrivalTime: undefined,
  pkgs: undefined,
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
const savedCarrierName = ref<string>('');

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

const statusColor = computed(() => {
  switch (status.value) {
    case LoadingOrderStatus.Claimed: {
      return 'processing';
    }
    case LoadingOrderStatus.Completed: {
      return 'success';
    }
    case LoadingOrderStatus.Pending: {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
});

const packageDisabled = computed(() => packageItems.value.length === 0);
const yardDisabled = computed(() => carrierYards.value.length === 0);

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

const supervisorSelectedItems = computed(
  () =>
    (detail.value?.loadingOrderUsers ?? [])
      .map((row) => row.user)
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((user) => ({
        id: user.id,
        nickName: user.nickName ?? '',
        enName: user.enName,
        employeeID: user.employeeID,
        userAttribute: user.userAttribute,
      })) as any[],
);

/** 拉已保存海出的包装明细与船公司堆场 */
const loadOptionSources = async () => {
  packageItems.value = [];
  carrierYards.value = [];
  savedPackageName.value = '';
  savedCarrierName.value = '';
  if (!seaExportId.value) return;

  const seaExport = await getSeaExportDetail(seaExportId.value);
  const codePackageId = seaExport?.transportOrder?.codePackageId;
  const carrierId = seaExport?.carrierId;
  savedPackageName.value = seaExport?.transportOrder?.codePackage?.name ?? '';
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
    requirementItemIds: (current?.loadingRequirementItemIds ?? []).map(String),
    userIds: (current?.loadingOrderUsers ?? []).map((row) => row.userId),
  };
};

const loadDetail = async () => {
  if (!seaExportId.value) return;
  loading.value = true;
  try {
    const [result] = await Promise.all([
      getLoadingOrderBySeaExportId(seaExportId.value),
      loadOptionSources(),
    ]);
    detail.value = result ?? null;
    editing.value = false;
    resetFormFromDetail();
  } finally {
    loading.value = false;
  }
};

onMounted(loadDetail);
watch(seaExportId, () => {
  void loadDetail();
});

/** 新建：本地进入编辑态，确认时才落库 */
const handleCreate = () => {
  detail.value = null;
  form.value = {
    carrierYardId: undefined,
    codePackageItemId: undefined,
    estimatedArrivalTime: undefined,
    pkgs: undefined,
    requirementItemIds: [],
    userIds: [],
  };
  editing.value = true;
};

const handleEdit = () => {
  resetFormFromDetail();
  editing.value = true;
};

const handleCancelEdit = () => {
  editing.value = false;
  resetFormFromDetail();
};

const onUserIdsChange = (value: unknown) => {
  const next = Array.isArray(value) ? value : [];
  if (next.length > MAX_SUPERVISOR_COUNT) {
    message.warning(
      $t('seaExport.loadingOrder.supervisorLimit', [MAX_SUPERVISOR_COUNT]),
    );
    form.value.userIds = next.slice(0, MAX_SUPERVISOR_COUNT);
    return;
  }
  form.value.userIds = next;
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

const buildPayload = () => ({
  carrierYardId: form.value.carrierYardId ?? null,
  codePackageItemId: form.value.codePackageItemId ?? null,
  estimatedArrivalTime: form.value.estimatedArrivalTime ?? null,
  pkgs: form.value.pkgs ?? null,
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
      await addLoadingOrder({
        seaExportId: seaExportId.value,
        ...buildPayload(),
      });
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

const seaExportSummary = computed(() => detail.value?.seaExport);
const orderCtns = computed(() => detail.value?.orderCtns ?? []);
const requirements = computed(() => detail.value?.loadingRequirements ?? []);

const formatCtnAttachmentCount = (
  row: LoadingOrderAdminApi.LoadingOrderCtnDto,
) =>
  (row.attachmentGroups ?? []).reduce(
    (total, group) => total + (group.items?.length ?? 0),
    0,
  );
</script>

<template>
  <div class="m-3 flex flex-1 flex-col gap-3">
    <Spin :spinning="loading">
      <!-- 尚无工单 -->
      <Card v-if="!detail && !editing" size="small">
        <Empty :description="$t('seaExport.loadingOrder.emptyTip')">
          <Button v-if="canAdd" type="primary" @click="handleCreate">
            <IconifyIcon icon="mdi:plus" class="mr-1 size-4" />
            {{ $t('seaExport.loadingOrder.create') }}
          </Button>
        </Empty>
      </Card>

      <template v-else>
        <Card size="small">
          <template #title>
            <Space :size="8">
              <span>{{ $t('seaExport.loadingOrder.title') }}</span>
              <span
                v-if="detail?.loadingOrderNum"
                class="text-sm text-gray-500"
              >
                {{ detail.loadingOrderNum }}
              </span>
              <Tag v-if="detail" :color="statusColor">
                {{ LOADING_ORDER_STATUS_TEXT[detail.status] }}
              </Tag>
            </Space>
          </template>
          <template #extra>
            <Space :size="8">
              <template v-if="editing">
                <Button type="primary" :loading="saving" @click="handleSave">
                  {{ $t('common.save') }}
                </Button>
                <Button @click="handleCancelEdit">
                  {{ $t('common.cancel') }}
                </Button>
              </template>
              <template v-else-if="isUnsubmitted">
                <Button v-if="canEdit" @click="handleEdit">
                  {{ $t('common.edit') }}
                </Button>
                <Button v-if="canEdit" type="primary" @click="handleSubmit">
                  {{ $t('seaExport.loadingOrder.submit') }}
                </Button>
                <Button v-if="canDelete" danger @click="handleDelete">
                  {{ $t('common.delete') }}
                </Button>
              </template>
              <template v-else-if="isPending">
                <Button v-if="canEdit" @click="handleWithdraw">
                  {{ $t('seaExport.loadingOrder.withdraw') }}
                </Button>
              </template>
              <Tooltip
                v-else-if="isLocked"
                :title="$t('seaExport.loadingOrder.lockedTip')"
              >
                <Button disabled>{{ $t('common.edit') }}</Button>
              </Tooltip>
            </Space>
          </template>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div class="mb-1 text-xs text-gray-500">
                {{ $t('seaExport.loadingOrder.codePackageItem') }}
              </div>
              <Select
                v-model:value="form.codePackageItemId"
                :options="packageOptions"
                :disabled="!editing || packageDisabled"
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
              <div v-if="packageDisabled" class="mt-1 text-xs text-gray-400">
                {{ $t('seaExport.loadingOrder.packageMissing') }}
              </div>
              <div
                v-else-if="savedPackageName"
                class="mt-1 text-xs text-gray-400"
              >
                {{
                  $t('seaExport.loadingOrder.savedPackage', [savedPackageName])
                }}
              </div>
            </div>

            <div>
              <div class="mb-1 text-xs text-gray-500">
                {{ $t('seaExport.loadingOrder.pkgs') }}
              </div>
              <InputNumber
                v-model:value="form.pkgs"
                :disabled="!editing"
                :min="0"
                :precision="0"
                :controls="false"
                class="w-full"
              />
            </div>

            <div>
              <div class="mb-1 text-xs text-gray-500">
                {{ $t('seaExport.loadingOrder.estimatedArrivalTime') }}
              </div>
              <DatePicker
                :value="arrivalTimeValue"
                :disabled="!editing"
                show-time
                class="w-full"
                @change="onArrivalTimeChange"
              />
            </div>

            <div>
              <div class="mb-1 text-xs text-gray-500">
                {{ $t('seaExport.loadingOrder.carrierYard') }}
              </div>
              <Select
                v-model:value="form.carrierYardId"
                :options="yardOptions"
                :disabled="!editing || yardDisabled"
                :placeholder="
                  yardDisabled
                    ? $t('seaExport.loadingOrder.carrierMissing')
                    : $t('ui.placeholder.select')
                "
                allow-clear
                show-search
                option-filter-prop="label"
                class="w-full"
              />
              <div v-if="yardDisabled" class="mt-1 text-xs text-gray-400">
                {{ $t('seaExport.loadingOrder.carrierMissing') }}
              </div>
              <div
                v-else-if="savedCarrierName"
                class="mt-1 text-xs text-gray-400"
              >
                {{
                  $t('seaExport.loadingOrder.savedCarrier', [savedCarrierName])
                }}
              </div>
            </div>

            <div class="md:col-span-2">
              <div class="mb-1 text-xs text-gray-500">
                {{
                  $t('seaExport.loadingOrder.supervisors', [
                    MAX_SUPERVISOR_COUNT,
                  ])
                }}
              </div>
              <UserSelect
                :value="form.userIds"
                :disabled="!editing"
                :user-attribute="UserAttribute.LoadingSupervision"
                :selected-items="supervisorSelectedItems"
                mode="multiple"
                class="w-full"
                @update:value="onUserIdsChange"
              />
            </div>

            <div v-if="detail" class="md:col-span-2">
              <div class="mb-1 text-xs text-gray-500">
                {{ $t('seaExport.loadingOrder.progress') }}
              </div>
              <div class="text-xs text-gray-600">
                <span v-if="detail.submitUserName">
                  {{
                    $t('seaExport.loadingOrder.submitBy', [
                      detail.submitUserName,
                      formatDateTime(detail.submitTime ?? undefined) || '-',
                    ])
                  }}
                </span>
                <span v-else>-</span>
              </div>
              <div
                v-if="detail.rejectTime"
                class="mt-1 text-xs text-orange-500"
              >
                {{
                  $t('seaExport.loadingOrder.lastReject', [
                    formatDateTime(detail.rejectTime ?? undefined) || '-',
                    detail.rejectReason || '-',
                  ])
                }}
              </div>
            </div>
          </div>
        </Card>

        <!-- 海运出口简要 -->
        <Card
          v-if="seaExportSummary"
          size="small"
          :title="$t('seaExport.loadingOrder.seaExportSummary')"
        >
          <div
            class="grid grid-cols-2 gap-3 text-xs md:grid-cols-4 xl:grid-cols-6"
          >
            <div>
              <div class="text-gray-500">
                {{ $t('seaExport.loadingOrder.mblNum') }}
              </div>
              <div>{{ seaExportSummary.mblNum || '-' }}</div>
            </div>
            <div>
              <div class="text-gray-500">
                {{ $t('seaExport.loadingOrder.vesselVoyage') }}
              </div>
              <div>
                {{
                  [seaExportSummary.vessel, seaExportSummary.innerVoyno]
                    .filter(Boolean)
                    .join(' / ') || '-'
                }}
              </div>
            </div>
            <div>
              <div class="text-gray-500">
                {{ $t('seaExport.loadingOrder.carrier') }}
              </div>
              <div>
                {{
                  seaExportSummary.carrier?.cnShortName ||
                  seaExportSummary.carrier?.cnName ||
                  '-'
                }}
              </div>
            </div>
            <div>
              <div class="text-gray-500">
                {{ $t('seaExport.loadingOrder.goods') }}
              </div>
              <div>
                {{
                  (seaExportSummary.codeGoodss ?? [])
                    .map((item) => item.name)
                    .filter(Boolean)
                    .join('、') || '-'
                }}
              </div>
            </div>
            <div>
              <div class="text-gray-500">
                {{ $t('seaExport.loadingOrder.mainPkgs') }}
              </div>
              <div>
                {{ seaExportSummary.pkgs ?? '-' }}
                {{ seaExportSummary.codePackage?.name || '' }}
              </div>
            </div>
            <div>
              <div class="text-gray-500">
                {{ $t('seaExport.loadingOrder.kgs') }}
              </div>
              <div>{{ seaExportSummary.kgs ?? '-' }}</div>
            </div>
          </div>
        </Card>

        <!-- 监装要求勾选 -->
        <Card size="small" :title="$t('seaExport.loadingOrder.requirements')">
          <Empty
            v-if="requirements.length === 0"
            :description="$t('seaExport.loadingOrder.requirementEmpty')"
          />
          <div v-else class="flex flex-col gap-3">
            <div v-for="group in requirements" :key="group.id">
              <div class="mb-1 text-sm font-medium">{{ group.name }}</div>
              <div class="flex flex-wrap gap-x-6 gap-y-2">
                <Checkbox
                  v-for="item in group.loadingRequirementItems ?? []"
                  :key="item.id"
                  :checked="isRequirementChecked(item.id)"
                  :disabled="!editing"
                  @change="
                    (e) =>
                      toggleRequirementItem(item.id, Boolean(e.target.checked))
                  "
                >
                  {{ item.name }}
                  <span v-if="item.remark" class="text-xs text-gray-400">
                    （{{ item.remark }}）
                  </span>
                </Checkbox>
              </div>
            </div>
          </div>
        </Card>

        <!-- 箱型只读：箱内容由监装师傅在小程序维护 -->
        <Card size="small" :title="$t('seaExport.loadingOrder.orderCtns')">
          <Table
            :data-source="orderCtns"
            :pagination="false"
            size="small"
            row-key="id"
            bordered
          >
            <Table.Column
              :title="$t('seaExport.loadingOrder.ctnCode')"
              key="ctnCode"
              :min-width="120"
            >
              <template #default="{ record }">
                {{ record.ctnCode?.name || record.ctnCode?.ctnName || '-' }}
              </template>
            </Table.Column>
            <Table.Column
              :title="$t('seaExport.loadingOrder.ctnNo')"
              data-index="ctnNo"
              :min-width="140"
            />
            <Table.Column
              :title="$t('seaExport.loadingOrder.sealNo')"
              data-index="sealNo"
              :min-width="140"
            />
            <Table.Column
              :title="$t('seaExport.loadingOrder.isLoadingCompleted')"
              key="isLoadingCompleted"
              width="110"
              align="center"
            >
              <template #default="{ record }">
                <Tag :color="record.isLoadingCompleted ? 'success' : 'default'">
                  {{
                    record.isLoadingCompleted
                      ? $t('common.yes')
                      : $t('common.no')
                  }}
                </Tag>
              </template>
            </Table.Column>
            <Table.Column
              :title="$t('seaExport.loadingOrder.attachmentCount')"
              key="attachments"
              width="110"
              align="center"
            >
              <template #default="{ record }">
                {{ formatCtnAttachmentCount(record) }}
              </template>
            </Table.Column>
          </Table>
          <div class="mt-1 text-xs text-gray-400">
            {{ $t('seaExport.loadingOrder.orderCtnsTip') }}
          </div>
        </Card>
      </template>
    </Spin>
  </div>
</template>
