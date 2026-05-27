<script lang="ts" setup>
import type { SeServiceConfigAdminApi } from '#/api/system/base-data/se-service-config-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import {
  Button,
  Checkbox,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Switch,
} from 'ant-design-vue';

import {
  addSeServiceConfig,
  editSeServiceConfig,
  getSeServiceConfigDetail,
} from '#/api/system/base-data/se-service-config-admin';
import { UserAttribute } from '#/api/system/user-admin';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import { $t } from '#/locales';
import { getEnumItems } from '#/utils/init-enum';
import { loadSeServiceTypeOptions, resolveServiceTypeLabel } from '../data';
import {
  combineUserAttribute,
  getSeaExportOrderUserRoleOptions,
  parseSeaExportUserAttribute,
} from '#/views/system/user/data';

type SelectOption = { label: string; value: number };
type AttributeServiceSummaryRow = {
  attributeLabel: string;
  attributeValue: number;
  serviceLabels: string[];
};
type PortSelectItem = {
  id: number | string;
  portName?: string;
  cnName?: string;
  ediCode?: string;
  status?: number;
};

type PropRefRow = {
  id?: string;
  seaExportPropEnum: number;
};

type ItemRow = {
  rowKey: string;
  id?: string;
  serviceType?: number;
  userAttributeFlags: number[];
  autoComplete: boolean;
  manualAllowed: boolean;
  reminder: boolean;
  remark?: string;
  seServiceShows: PropRefRow[];
  seServiceLocks: PropRefRow[];
  seServiceRequires: PropRefRow[];
};

const emit = defineEmits<{ success: [] }>();

const formState = ref<{
  id?: string;
  polId?: number | string;
  sortId?: number;
  remark?: string;
}>({});
const itemRows = ref<ItemRow[]>([]);
const selectedPortItems = ref<PortSelectItem[]>([]);
const serviceTypeOptions = ref<SelectOption[]>([]);
const seaExportPropOptions = ref<SelectOption[]>([]);
let rowKeySeed = 0;

const userAttributeOptions = computed(() => getSeaExportOrderUserRoleOptions());

/** 服务项各行首个 label 统一宽度，便于纵向对齐 */
const itemLeadingLabelCol = { flex: '0 0 120px' };
const itemLeadingWrapperCol = { flex: '1 1 0' };
const itemPropLabelCol = { flex: '0 0 128px' };
const itemInlineLabelCol = { flex: '0 0 auto' };
const itemInlineWrapperCol = { flex: '0 0 auto' };

const getTitle = computed(() =>
  formState.value.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.seServiceConfig.name')])
    : $t('ui.actionTitle.create', [
        $t('system.basicData.seServiceConfig.name'),
      ]),
);

const getPropValues = (items: PropRefRow[]) =>
  items.map((item) => Number(item.seaExportPropEnum));

const getPropMap = (items: PropRefRow[]) => {
  const map = new Map<number, PropRefRow>();
  for (const item of items) {
    const key = Number(item.seaExportPropEnum);
    if (!Number.isNaN(key) && !map.has(key)) {
      map.set(key, item);
    }
  }
  return map;
};

const normalizeValues = (values: (number | string)[]) => {
  return [
    ...new Set(
      values.map((value) => Number(value)).filter((v) => !Number.isNaN(v)),
    ),
  ];
};

const normalizeEnumNumber = (value: number | string | undefined | null) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeIdAsString = (value: number | string | undefined | null) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return String(value);
};

const updatePropRefs = (
  row: ItemRow,
  field: 'seServiceShows' | 'seServiceLocks' | 'seServiceRequires',
  values: (number | string)[],
) => {
  const normalized = normalizeValues(values);
  const existed = getPropMap(row[field]);
  row[field] = normalized.map((value) => ({
    id: existed.get(value)?.id,
    seaExportPropEnum: value,
  }));
};

const createRowKey = () => `se-service-item-${Date.now()}-${rowKeySeed++}`;

const addItem = () => {
  itemRows.value.push({
    rowKey: createRowKey(),
    serviceType: undefined,
    userAttributeFlags: [],
    autoComplete: false,
    manualAllowed: true,
    reminder: false,
    remark: '',
    seServiceShows: [],
    seServiceLocks: [],
    seServiceRequires: [],
  });
};

const removeItem = (index: number) => {
  itemRows.value.splice(index, 1);
};

const moveItem = (from: number, to: number) => {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= itemRows.value.length ||
    to >= itemRows.value.length
  ) {
    return;
  }
  const [moved] = itemRows.value.splice(from, 1);
  itemRows.value.splice(to, 0, moved);
};

const moveUp = (index: number) => {
  moveItem(index, index - 1);
};

const moveDown = (index: number) => {
  moveItem(index, index + 1);
};

const validateForm = () => {
  if (
    formState.value.polId === undefined ||
    formState.value.polId === null ||
    formState.value.polId === ''
  ) {
    message.error(
      $t('ui.formRules.selectRequired', [
        $t('system.basicData.seServiceConfig.polId'),
      ]),
    );
    return false;
  }

  const serviceTypes: number[] = [];
  for (let i = 0; i < itemRows.value.length; i++) {
    const row = itemRows.value[i];
    if (row.serviceType === undefined || row.serviceType === null) {
      message.error(
        `${$t('system.basicData.seServiceConfig.item')} #${i + 1} ${$t('ui.formRules.required', [$t('system.basicData.seServiceConfig.serviceType')])}`,
      );
      return false;
    }
    serviceTypes.push(Number(row.serviceType));
  }

  if (new Set(serviceTypes).size !== serviceTypes.length) {
    message.error('同一配置下服务项类型不能重复');
    return false;
  }

  return true;
};

const toPayloadItemsForAdd =
  (): SeServiceConfigAdminApi.SeServiceConfigItemAddDto[] => {
    return itemRows.value.map((row, index) => ({
      serviceType: Number(row.serviceType),
      userAttribute: combineUserAttribute(row.userAttributeFlags),
      autoComplete: row.autoComplete,
      manualAllowed: row.manualAllowed,
      reminder: row.reminder,
      sortId: index,
      remark: row.remark,
      seServiceShows: row.seServiceShows.map((item) => ({
        seaExportPropEnum: Number(item.seaExportPropEnum),
      })),
      seServiceLocks: row.seServiceLocks.map((item) => ({
        seaExportPropEnum: Number(item.seaExportPropEnum),
      })),
      seServiceRequires: row.seServiceRequires.map((item) => ({
        seaExportPropEnum: Number(item.seaExportPropEnum),
      })),
    }));
  };

const toPayloadItemsForEdit =
  (): SeServiceConfigAdminApi.SeServiceConfigItemEditDto[] => {
    return itemRows.value.map((row, index) => ({
      id: row.id,
      serviceType: Number(row.serviceType),
      userAttribute: combineUserAttribute(row.userAttributeFlags),
      autoComplete: row.autoComplete,
      manualAllowed: row.manualAllowed,
      reminder: row.reminder,
      sortId: index,
      remark: row.remark,
      seServiceShows: row.seServiceShows.map((item) => ({
        id: item.id,
        seaExportPropEnum: Number(item.seaExportPropEnum),
      })),
      seServiceLocks: row.seServiceLocks.map((item) => ({
        id: item.id,
        seaExportPropEnum: Number(item.seaExportPropEnum),
      })),
      seServiceRequires: row.seServiceRequires.map((item) => ({
        id: item.id,
        seaExportPropEnum: Number(item.seaExportPropEnum),
      })),
    }));
  };

const resetState = () => {
  formState.value = {
    id: undefined,
    polId: undefined,
    sortId: 0,
    remark: '',
  };
  itemRows.value = [];
  selectedPortItems.value = [];
};

const buildSelectOptions = (
  items: { enable: boolean; displayName?: string; value: number }[],
) => {
  return (items || [])
    .filter((item) => item.enable !== false)
    .map((item) => ({
      label: item.displayName || `${item.value}`,
      value: Number(item.value),
    }))
    .sort((a, b) => a.value - b.value);
};

const getServiceTypeLabel = (serviceType?: number) =>
  resolveServiceTypeLabel(serviceType, serviceTypeOptions.value);

const userAttributeServiceSummary = computed<AttributeServiceSummaryRow[]>(
  () => {
    const attributeServiceMap = new Map<number, Set<number>>();

    for (const row of itemRows.value) {
      if (row.serviceType === undefined || row.serviceType === null) {
        continue;
      }
      const serviceType = Number(row.serviceType);
      for (const flag of row.userAttributeFlags) {
        const current = attributeServiceMap.get(flag) ?? new Set<number>();
        current.add(serviceType);
        attributeServiceMap.set(flag, current);
      }
    }

    return userAttributeOptions.value.map((option) => ({
      attributeValue: option.value,
      attributeLabel: option.label,
      serviceLabels: [...(attributeServiceMap.get(option.value) ?? [])]
        .sort((a, b) => a - b)
        .map((type) => getServiceTypeLabel(type)),
    }));
  },
);

const configuredUserAttributeServiceSummary = computed(() =>
  userAttributeServiceSummary.value.filter(
    (row) => row.serviceLabels.length > 0,
  ),
);

const attributeOverviewRoleClassMap: Record<number, string> = {
  [UserAttribute.Sales]: 'role-sales',
  [UserAttribute.Business]: 'role-business',
  [UserAttribute.Operation]: 'role-operation',
  [UserAttribute.CustomerService]: 'role-customer-service',
  [UserAttribute.Documentation]: 'role-documentation',
  [UserAttribute.OverseasCustomerService]: 'role-overseas-customer-service',
};

const getAttributeOverviewRoleClass = (attributeValue: number) =>
  attributeOverviewRoleClassMap[attributeValue] ?? 'role-default';

const getItemTitle = (row: ItemRow, index: number) => {
  const baseTitle = `${$t('system.basicData.seServiceConfig.item')} #${index + 1}`;
  const serviceTypeLabel = getServiceTypeLabel(row.serviceType);
  return serviceTypeLabel ? `${baseTitle} · ${serviceTypeLabel}` : baseTitle;
};

const loadServiceTypeOptions = async () => {
  serviceTypeOptions.value = await loadSeServiceTypeOptions();
};

const loadSeaExportPropOptions = async () => {
  const items = await getEnumItems('SeaExportPropEnum');
  seaExportPropOptions.value = buildSelectOptions(items || []);
};

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!validateForm()) return;

    modalApi.lock();
    try {
      if (formState.value.id) {
        await editSeServiceConfig({
          id: formState.value.id,
          polId: formState.value.polId!,
          sortId: formState.value.sortId,
          remark: formState.value.remark,
          seServiceConfigItems: toPayloadItemsForEdit(),
        });
      } else {
        await addSeServiceConfig({
          polId: formState.value.polId!,
          sortId: formState.value.sortId,
          remark: formState.value.remark,
          seServiceConfigItems: toPayloadItemsForAdd(),
        });
      }

      message.success($t('ui.actionMessage.operationSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;

    resetState();
    const modalData = modalApi.getData<{
      id?: string;
      serviceTypeOptions?: SelectOption[];
      polId?: number | string;
      polPortName?: string;
      polCnName?: string;
    }>();
    await Promise.all([loadServiceTypeOptions(), loadSeaExportPropOptions()]);
    if (
      serviceTypeOptions.value.length === 0 &&
      (modalData?.serviceTypeOptions?.length || 0) > 0
    ) {
      serviceTypeOptions.value = modalData?.serviceTypeOptions || [];
    }

    if (!modalData?.id) {
      addItem();
      return;
    }

    modalApi.lock();
    try {
      const detail = await getSeServiceConfigDetail(modalData.id);
      const normalizedPolId = normalizeIdAsString(
        detail.polId ?? modalData?.polId,
      );
      formState.value = {
        id: detail.id,
        polId: normalizedPolId,
        sortId: detail.sortId,
        remark: detail.remark,
      };
      selectedPortItems.value =
        normalizedPolId === undefined
          ? []
          : [
              {
                id: normalizedPolId,
                portName: detail.pol?.portName || modalData?.polPortName,
                cnName: detail.pol?.cnName || modalData?.polCnName,
                status: 0,
              },
            ];
      itemRows.value = (detail.seServiceConfigItems || [])
        .slice()
        .sort(
          (a, b) =>
            Number(a.sortId ?? Number.MAX_SAFE_INTEGER) -
            Number(b.sortId ?? Number.MAX_SAFE_INTEGER),
        )
        .map((item) => ({
          rowKey: item.id || createRowKey(),
          id: item.id,
          serviceType: normalizeEnumNumber(item.serviceType),
          userAttributeFlags: parseSeaExportUserAttribute(
            Number(item.userAttribute || 0),
          ),
          autoComplete: Boolean(item.autoComplete),
          manualAllowed: Boolean(item.manualAllowed),
          reminder: Boolean(item.reminder),
          remark: item.remark,
          seServiceShows: (item.seServiceShows || []).map((sub) => ({
            id: sub.id,
            seaExportPropEnum: Number(sub.seaExportPropEnum),
          })),
          seServiceLocks: (item.seServiceLocks || []).map((sub) => ({
            id: sub.id,
            seaExportPropEnum: Number(sub.seaExportPropEnum),
          })),
          seServiceRequires: (item.seServiceRequires || []).map((sub) => ({
            id: sub.id,
            seaExportPropEnum: Number(sub.seaExportPropEnum),
          })),
        }));
      if (itemRows.value.length === 0) {
        addItem();
      }
    } finally {
      modalApi.lock(false);
    }
  },
});
</script>

<template>
  <Modal :title="getTitle" class="w-[1000px]">
    <div class="mx-4">
      <Form layout="vertical">
        <div class="grid grid-cols-2 gap-4">
          <FormItem
            :label="$t('system.basicData.seServiceConfig.polId')"
            required
          >
            <PortSelect
              v-model="formState.polId"
              :selected-items="selectedPortItems"
              :allow-clear="true"
              :placeholder="$t('ui.placeholder.select')"
            />
          </FormItem>
          <FormItem :label="$t('system.basicData.seServiceConfig.sortId')">
            <InputNumber
              v-model:value="formState.sortId"
              :min="0"
              :precision="0"
              class="w-full"
            />
          </FormItem>
        </div>
        <FormItem :label="$t('system.basicData.seServiceConfig.remark')">
          <Input.TextArea
            v-model:value="formState.remark"
            :rows="2"
            :allow-clear="true"
          />
        </FormItem>
      </Form>

      <div class="mb-3 mt-4 flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium">
            {{ $t('system.basicData.seServiceConfig.items') }}
          </div>
          <div
            v-if="configuredUserAttributeServiceSummary.length > 0"
            class="attribute-overview mt-1.5"
          >
            <span class="attribute-overview__label">
              {{
                $t(
                  'system.basicData.seServiceConfig.userAttributeServiceOverview',
                )
              }}
            </span>
            <div class="attribute-overview__groups">
              <span
                v-for="row in configuredUserAttributeServiceSummary"
                :key="row.attributeValue"
                class="attribute-overview__group"
              >
                <span
                  class="attribute-overview__role"
                  :class="getAttributeOverviewRoleClass(row.attributeValue)"
                >
                  {{ row.attributeLabel }}
                </span>
                <span
                  v-for="label in row.serviceLabels"
                  :key="`${row.attributeValue}-${label}`"
                  class="attribute-overview__service"
                >
                  {{ label }}
                </span>
              </span>
            </div>
          </div>
        </div>
        <Button type="dashed" class="shrink-0" @click="addItem">
          <Plus class="size-4" />
          {{ $t('system.basicData.seServiceConfig.addItem') }}
        </Button>
      </div>

      <TransitionGroup name="service-item" tag="div" class="space-y-3 pr-1">
        <div
          v-for="(row, index) in itemRows"
          :key="row.rowKey"
          class="rounded border border-gray-200 p-3"
        >
          <div class="mb-3 flex items-center justify-between">
            <div
              class="border-l-4 border-blue-500 pl-2 text-base font-semibold text-slate-800"
            >
              {{ getItemTitle(row, index) }}
            </div>
            <Space :size="4">
              <Button
                type="text"
                :disabled="index === 0"
                @click="moveUp(index)"
              >
                {{ $t('system.basicData.seServiceConfig.moveUp') }}
              </Button>
              <Button
                type="text"
                :disabled="index === itemRows.length - 1"
                @click="moveDown(index)"
              >
                {{ $t('system.basicData.seServiceConfig.moveDown') }}
              </Button>
              <Button
                type="text"
                danger
                :disabled="itemRows.length <= 1"
                @click="removeItem(index)"
              >
                {{ $t('common.delete') }}
              </Button>
            </Space>
          </div>

          <Form layout="horizontal" class="service-item-form">
            <div class="mb-3 flex flex-wrap items-start gap-x-4 gap-y-2">
              <FormItem
                class="service-item-leading-field min-w-0 flex-[2]"
                :label="$t('system.basicData.seServiceConfig.serviceType')"
                :label-col="itemLeadingLabelCol"
                :wrapper-col="itemLeadingWrapperCol"
                required
              >
                <Select
                  v-model:value="row.serviceType"
                  :allow-clear="true"
                  :placeholder="$t('ui.placeholder.select')"
                  :options="serviceTypeOptions"
                />
              </FormItem>
              <FormItem
                class="service-item-inline-field shrink-0"
                :label="$t('system.basicData.seServiceConfig.autoComplete')"
                :label-col="itemInlineLabelCol"
                :wrapper-col="itemInlineWrapperCol"
              >
                <Switch v-model:checked="row.autoComplete" />
              </FormItem>
              <FormItem
                class="service-item-inline-field shrink-0"
                :label="$t('system.basicData.seServiceConfig.manualAllowed')"
                :label-col="itemInlineLabelCol"
                :wrapper-col="itemInlineWrapperCol"
              >
                <Switch v-model:checked="row.manualAllowed" />
              </FormItem>
              <FormItem
                class="service-item-inline-field shrink-0"
                :label="$t('system.basicData.seServiceConfig.reminder')"
                :label-col="itemInlineLabelCol"
                :wrapper-col="itemInlineWrapperCol"
              >
                <Switch v-model:checked="row.reminder" />
              </FormItem>
            </div>

            <FormItem
              class="service-item-leading-field mb-3"
              :label="$t('system.basicData.seServiceConfig.userAttribute')"
              :label-col="itemLeadingLabelCol"
              :wrapper-col="itemLeadingWrapperCol"
            >
              <Checkbox.Group
                v-model:value="row.userAttributeFlags"
                :options="userAttributeOptions"
              />
            </FormItem>

            <div class="mb-3 grid grid-cols-3 gap-x-4 gap-y-2">
              <FormItem
                class="service-item-leading-field min-w-0"
                :label="$t('system.basicData.seServiceConfig.seServiceShows')"
                :label-col="itemLeadingLabelCol"
                :wrapper-col="itemLeadingWrapperCol"
              >
                <Select
                  mode="tags"
                  :value="getPropValues(row.seServiceShows)"
                  :allow-clear="true"
                  :options="seaExportPropOptions"
                  :placeholder="$t('ui.placeholder.select')"
                  @change="
                    (values) =>
                      updatePropRefs(
                        row,
                        'seServiceShows',
                        (values || []) as (number | string)[],
                      )
                  "
                />
              </FormItem>
              <FormItem
                class="service-item-prop-field min-w-0"
                :label="$t('system.basicData.seServiceConfig.seServiceLocks')"
                :label-col="itemPropLabelCol"
                :wrapper-col="itemLeadingWrapperCol"
              >
                <Select
                  mode="tags"
                  :value="getPropValues(row.seServiceLocks)"
                  :allow-clear="true"
                  :options="seaExportPropOptions"
                  :placeholder="$t('ui.placeholder.select')"
                  @change="
                    (values) =>
                      updatePropRefs(
                        row,
                        'seServiceLocks',
                        (values || []) as (number | string)[],
                      )
                  "
                />
              </FormItem>
              <FormItem
                class="service-item-prop-field min-w-0"
                :label="
                  $t('system.basicData.seServiceConfig.seServiceRequires')
                "
                :label-col="itemPropLabelCol"
                :wrapper-col="itemLeadingWrapperCol"
              >
                <Select
                  mode="tags"
                  :value="getPropValues(row.seServiceRequires)"
                  :allow-clear="true"
                  :options="seaExportPropOptions"
                  :placeholder="$t('ui.placeholder.select')"
                  @change="
                    (values) =>
                      updatePropRefs(
                        row,
                        'seServiceRequires',
                        (values || []) as (number | string)[],
                      )
                  "
                />
              </FormItem>
            </div>

            <FormItem
              class="service-item-leading-field mb-0"
              :label="$t('system.basicData.seServiceConfig.remark')"
              :label-col="itemLeadingLabelCol"
              :wrapper-col="itemLeadingWrapperCol"
            >
              <Input.TextArea
                v-model:value="row.remark"
                :rows="2"
                :allow-clear="true"
              />
            </FormItem>
          </Form>
        </div>
      </TransitionGroup>

      <Space class="mt-2 text-xs text-gray-500">
        <span>{{ $t('system.basicData.seServiceConfig.sortTip') }}</span>
      </Space>
    </div>
  </Modal>
</template>

<style scoped>
.attribute-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
}

.attribute-overview__label {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 20px;
  color: #94a3b8;
}

.attribute-overview__label::after {
  content: '：';
}

.attribute-overview__groups {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.attribute-overview__group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  max-width: 100%;
  padding: 2px 4px 2px 2px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.attribute-overview__role,
.attribute-overview__service {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
  border-radius: 4px;
}

.attribute-overview__role {
  padding: 0 6px;
  font-weight: 600;
}

.attribute-overview__service {
  padding: 0 6px;
  font-weight: 500;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.attribute-overview__role.role-sales {
  color: #1d4ed8;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.attribute-overview__role.role-business {
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}

.attribute-overview__role.role-operation {
  color: #6d28d9;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
}

.attribute-overview__role.role-customer-service {
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.attribute-overview__role.role-documentation {
  color: #be123c;
  background: #fff1f2;
  border: 1px solid #fecdd3;
}

.attribute-overview__role.role-overseas-customer-service {
  color: #0e7490;
  background: #ecfeff;
  border: 1px solid #a5f3fc;
}

.attribute-overview__role.role-default {
  color: #334155;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
}

.service-item-form :deep(.ant-form-item-label) {
  text-align: left;
}

.service-item-form :deep(.ant-form-item-label > label) {
  justify-content: flex-start;
}

.service-item-form :deep(.service-item-leading-field .ant-form-item-label) {
  flex: 0 0 120px !important;
  max-width: 120px;
}

.service-item-form
  :deep(.service-item-leading-field .ant-form-item-label > label) {
  white-space: nowrap;
}

.service-item-form :deep(.service-item-inline-field) {
  margin-bottom: 0;
}

.service-item-form :deep(.service-item-inline-field .ant-form-item-row) {
  flex-wrap: nowrap;
}

.service-item-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.service-item-move,
.service-item-enter-active,
.service-item-leave-active {
  transition:
    transform 260ms cubic-bezier(0.25, 1, 0.5, 1),
    opacity 220ms cubic-bezier(0.25, 1, 0.5, 1);
}

.service-item-enter-from,
.service-item-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (prefers-reduced-motion: reduce) {
  .service-item-move,
  .service-item-enter-active,
  .service-item-leave-active {
    transition: none;
  }

  .service-item-enter-from,
  .service-item-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
