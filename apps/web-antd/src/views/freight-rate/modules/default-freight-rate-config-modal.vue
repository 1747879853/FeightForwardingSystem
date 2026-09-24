<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, message, Space } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';

import {
  enrichDefaultFreightRateLabels,
  loadDefaultFreightRateConfig,
  removeDefaultFreightRateConfig,
  saveDefaultFreightRateConfig,
  type DefaultFreightRateValue,
} from './composables/use-default-freight-rate-config';

defineOptions({ name: 'DefaultFreightRateConfigModal' });

const emit = defineEmits<{ success: [] }>();

const configExists = ref(false);
const saving = ref(false);
const clearing = ref(false);
/** 打开弹窗时读到的配置，保存时用于复用未改动项的显示名 */
const loadedConfig = ref<DefaultFreightRateValue>({});
/** 个人设置主键，清空配置时 DeleteAsync 需要 */
const loadedSettingId = ref<number | undefined>(undefined);
/** 本次选择订舱代理时 ClientSelect 带回的显示名 */
const pendingBookingAgentLabel = ref<null | string>(null);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'vertical',
  schema: [
    {
      component: 'RadioGroup',
      fieldName: 'recommend',
      label: '是否推荐',
      defaultValue: false,
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'isDirect',
      label: '是否直达',
      defaultValue: true,
      componentProps: {
        options: [
          { label: '是', value: true },
          { label: '否', value: false },
        ],
      },
    },
    {
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: '币别',
      componentProps: {
        placeholder: '请选择默认币别',
        allowClear: true,
      },
    },
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: '船公司',
      componentProps: {
        placeholder: '请选择默认船公司',
        allowClear: true,
      },
    },
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: '起运港',
      componentProps: {
        placeholder: '请选择默认起运港',
        allowClear: true,
      },
    },
    {
      component: 'ClientSelect',
      fieldName: 'bookingAgentId',
      label: '订舱代理',
      componentProps: {
        placeholder: '请选择默认订舱代理',
        allowClear: true,
        industryCategory: 'o',
        onChange: (_value: unknown, option: any) => {
          const opt = Array.isArray(option) ? option[0] : option;
          const label = String(
            opt?.label ?? opt?.name ?? opt?.fullName ?? '',
          ).trim();
          pendingBookingAgentLabel.value = label || null;
        },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'polFreeDays',
      label: '起运港免用箱',
      componentProps: {
        placeholder: '天数',
        min: 0,
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'podFreeDays',
      label: '目的港免用箱',
      componentProps: {
        placeholder: '天数',
        min: 0,
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddem',
      label: '目的港免堆期',
      componentProps: {
        placeholder: '天数',
        min: 0,
        class: 'w-full',
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'poddet',
      label: '目的港免箱期',
      componentProps: {
        placeholder: '天数',
        min: 0,
        class: 'w-full',
      },
    },
    {
      component: 'Input',
      fieldName: 'voyage',
      label: '航程',
      componentProps: {
        placeholder: '请输入默认航程',
        maxlength: 64,
        allowClear: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'contractNo',
      label: '约号',
      componentProps: {
        placeholder: '请输入默认约号',
        maxlength: 128,
        allowClear: true,
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: '备注',
      formItemClass: 'col-span-2',
      componentProps: {
        placeholder: '请输入默认备注',
        maxlength: 512,
        rows: 3,
        allowClear: true,
      },
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const hintText = computed(() =>
  configExists.value
    ? '已读取个人配置 DefaultFreightRate。保存将更新；清空会删除该个人配置。'
    : '尚未配置 DefaultFreightRate。保存后写入个人配置，新增运价时自动带出。',
);

async function fillForm(value: DefaultFreightRateValue) {
  pendingBookingAgentLabel.value = null;
  await formApi.resetForm();
  await formApi.setValues({
    recommend: value.recommend ?? false,
    isDirect: value.isDirect ?? true,
    currencyId: value.currencyId ?? undefined,
    carrierId: value.carrierId ?? undefined,
    polId: value.polId ?? undefined,
    bookingAgentId: value.bookingAgentId ?? undefined,
    polFreeDays: value.polFreeDays ?? undefined,
    podFreeDays: value.podFreeDays ?? undefined,
    poddem: value.poddem ?? undefined,
    poddet: value.poddet ?? undefined,
    voyage: value.voyage ?? '',
    contractNo: value.contractNo ?? '',
    remark: value.remark ?? '',
  });

  // 有 id 时给下拉补回显项（组件会按 id lazy load 详情）
  const schemaPatches: Array<{
    fieldName: string;
    componentProps: Record<string, unknown>;
  }> = [];
  if (value.carrierId != null) {
    schemaPatches.push({
      fieldName: 'carrierId',
      componentProps: { selectedItems: [{ id: value.carrierId }] },
    });
  }
  if (value.polId != null) {
    schemaPatches.push({
      fieldName: 'polId',
      componentProps: { selectedItems: [{ id: value.polId }] },
    });
  }
  if (value.bookingAgentId) {
    schemaPatches.push({
      fieldName: 'bookingAgentId',
      componentProps: {
        selectedItems: [{ id: value.bookingAgentId }],
      },
    });
  }
  if (schemaPatches.length > 0) {
    await formApi.updateSchema(schemaPatches);
  }
}

const [Modal, modalApi] = useVbenModal({
  class: 'w-[720px]',
  showConfirmButton: false,
  showCancelButton: false,
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    modalApi.lock();
    try {
      const { exists, value, id } = await loadDefaultFreightRateConfig();
      configExists.value = exists;
      loadedConfig.value = value;
      loadedSettingId.value = id;
      await fillForm(value);
    } finally {
      modalApi.lock(false);
    }
  },
});

async function handleSave() {
  const { valid } = await formApi.validate();
  if (!valid) return;

  saving.value = true;
  modalApi.lock();
  try {
    const values = (await formApi.getValues()) as DefaultFreightRateValue;
    const prev = loadedConfig.value;
    const draft: DefaultFreightRateValue = { ...values };
    if (
      values.carrierId != null &&
      String(values.carrierId) === String(prev.carrierId ?? '')
    ) {
      draft.carrierLabel = prev.carrierLabel;
    }
    if (
      values.polId != null &&
      String(values.polId) === String(prev.polId ?? '')
    ) {
      draft.polLabel = prev.polLabel;
    }
    if (
      values.currencyId != null &&
      String(values.currencyId) === String(prev.currencyId ?? '')
    ) {
      draft.currencyLabel = prev.currencyLabel;
    }
    if (
      values.bookingAgentId &&
      String(values.bookingAgentId) === String(prev.bookingAgentId ?? '')
    ) {
      draft.bookingAgentLabel = prev.bookingAgentLabel;
    }
    if (pendingBookingAgentLabel.value) {
      draft.bookingAgentLabel = pendingBookingAgentLabel.value;
    }

    const enriched = await enrichDefaultFreightRateLabels(draft);
    const newId = await saveDefaultFreightRateConfig(
      enriched,
      configExists.value,
    );
    configExists.value = true;
    loadedConfig.value = enriched;
    if (newId != null) {
      loadedSettingId.value = newId;
    }
    message.success('运价新增默认值已保存');
    emit('success');
    modalApi.close();
  } finally {
    saving.value = false;
    modalApi.lock(false);
  }
}

async function handleClear() {
  if (!configExists.value) {
    await fillForm({});
    message.info('当前没有可清空的配置');
    return;
  }
  clearing.value = true;
  modalApi.lock();
  try {
    await removeDefaultFreightRateConfig(loadedSettingId.value);
    configExists.value = false;
    loadedConfig.value = {};
    loadedSettingId.value = undefined;
    await fillForm({});
    message.success('已删除运价新增默认值配置');
    emit('success');
  } finally {
    clearing.value = false;
    modalApi.lock(false);
  }
}
</script>

<template>
  <Modal title="运价新增默认值配置">
    <div class="default-freight-config">
      <p class="default-freight-config__hint">{{ hintText }}</p>
      <Form />
    </div>

    <template #footer>
      <div class="default-freight-config__footer">
        <Button
          danger
          :loading="clearing"
          :disabled="saving"
          @click="handleClear"
        >
          清空配置
        </Button>
        <Space>
          <Button :disabled="saving || clearing" @click="modalApi.close()">
            取消
          </Button>
          <Button
            type="primary"
            :loading="saving"
            :disabled="clearing"
            @click="handleSave"
          >
            保存
          </Button>
        </Space>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.default-freight-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 4px 20px;
}

.default-freight-config__hint {
  padding: 10px 12px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 45%);
  border-radius: 8px;
}

.default-freight-config__footer {
  display: flex;
  flex: 1;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
</style>
