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
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import { $t } from '#/locales';
import { getEnumItems } from '#/utils/init-enum';
import {
  combineUserAttribute,
  getUserAttributeOptions,
  parseUserAttribute,
} from '#/views/system/user/data';

type SelectOption = { label: string; value: number };

type PropRefRow = {
  id?: string;
  seaExportPropEnum: number;
};

type ItemRow = {
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
const serviceTypeOptions = ref<SelectOption[]>([]);
const seaExportPropOptions = ref<SelectOption[]>([]);

const userAttributeOptions = computed(() => getUserAttributeOptions());

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

const addItem = () => {
  itemRows.value.push({
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
    return itemRows.value.map((row) => ({
      id: row.id,
      serviceType: Number(row.serviceType),
      userAttribute: combineUserAttribute(row.userAttributeFlags),
      autoComplete: row.autoComplete,
      manualAllowed: row.manualAllowed,
      reminder: row.reminder,
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

const getServiceTypeLabel = (serviceType?: number) => {
  if (serviceType === undefined || serviceType === null) {
    return '';
  }
  const option = serviceTypeOptions.value.find(
    (item) => Number(item.value) === Number(serviceType),
  );
  return option?.label || `${serviceType}`;
};

const getItemTitle = (row: ItemRow, index: number) => {
  const baseTitle = `${$t('system.basicData.seServiceConfig.item')} #${index + 1}`;
  const serviceTypeLabel = getServiceTypeLabel(row.serviceType);
  return serviceTypeLabel ? `${baseTitle} · ${serviceTypeLabel}` : baseTitle;
};

const loadServiceTypeOptions = async () => {
  const items = await getEnumItems('serviceType');
  serviceTypeOptions.value = buildSelectOptions(items || []);
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
      formState.value = {
        id: detail.id,
        polId: detail.polId,
        sortId: detail.sortId,
        remark: detail.remark,
      };
      itemRows.value = (detail.seServiceConfigItems || []).map((item) => ({
        id: item.id,
        serviceType: normalizeEnumNumber(item.serviceType),
        userAttributeFlags: parseUserAttribute(Number(item.userAttribute || 0)),
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

      <div class="mb-3 mt-4 flex items-center justify-between">
        <div class="text-sm font-medium">
          {{ $t('system.basicData.seServiceConfig.items') }}
        </div>
        <Button type="dashed" @click="addItem">
          <Plus class="size-4" />
          {{ $t('system.basicData.seServiceConfig.addItem') }}
        </Button>
      </div>

      <div class="space-y-3 pr-1">
        <div
          v-for="(row, index) in itemRows"
          :key="row.id || `new-${index}`"
          class="rounded border border-gray-200 p-3"
        >
          <div class="mb-3 flex items-center justify-between">
            <div
              class="border-l-4 border-blue-500 pl-2 text-base font-semibold text-slate-800"
            >
              {{ getItemTitle(row, index) }}
            </div>
            <Button
              type="text"
              danger
              :disabled="itemRows.length <= 1"
              @click="removeItem(index)"
            >
              {{ $t('common.delete') }}
            </Button>
          </div>

          <div class="grid grid-cols-4 gap-3">
            <FormItem
              :label="$t('system.basicData.seServiceConfig.serviceType')"
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
              :label="$t('system.basicData.seServiceConfig.autoComplete')"
            >
              <Switch v-model:checked="row.autoComplete" />
            </FormItem>
            <FormItem
              :label="$t('system.basicData.seServiceConfig.manualAllowed')"
            >
              <Switch v-model:checked="row.manualAllowed" />
            </FormItem>
            <FormItem :label="$t('system.basicData.seServiceConfig.reminder')">
              <Switch v-model:checked="row.reminder" />
            </FormItem>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <FormItem
              :label="$t('system.basicData.seServiceConfig.userAttribute')"
            >
              <Checkbox.Group
                v-model:value="row.userAttributeFlags"
                :options="userAttributeOptions"
              />
            </FormItem>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <FormItem
              :label="$t('system.basicData.seServiceConfig.seServiceShows')"
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
              :label="$t('system.basicData.seServiceConfig.seServiceLocks')"
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
              :label="$t('system.basicData.seServiceConfig.seServiceRequires')"
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

          <FormItem :label="$t('system.basicData.seServiceConfig.remark')">
            <Input.TextArea
              v-model:value="row.remark"
              :rows="2"
              :allow-clear="true"
            />
          </FormItem>
        </div>
      </div>

      <Space class="mt-2 text-xs text-gray-500">
        <span>{{ $t('system.basicData.seServiceConfig.sortTip') }}</span>
      </Space>
    </div>
  </Modal>
</template>
