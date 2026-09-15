<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Modal, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { batchEditSeaExport } from '#/api/sea-export/sea-export-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';

import { createClientSelectSchema } from '../../client/base/data';
import {
  buildPortSelectProps,
  formatSeaExportPortRemark,
  getTradeTermsTypeOptions,
  pickPortSelectOption,
} from '../data';

/** 选港后自动带出对应备注，与编辑页 `PORT_ID_FIELD_TO_REMARK_FIELD` 同口径 */
const PORT_ID_TO_REMARK_FIELD: Record<string, string> = {
  receivePortId: 'receivePortRemark',
  polId: 'polRemark',
  poT1Id: 'poT1Remark',
  poT2Id: 'poT2Remark',
  podId: 'podRemark',
  deliverPortId: 'deliverPortRemark',
};

const PORT_REMARK_TO_PAYLOAD: Record<string, string> = {
  receivePortRemark: 'receivePortRemark',
  polRemark: 'polRemark',
  poT1Remark: 'pot1Remark',
  poT2Remark: 'pot2Remark',
  podRemark: 'podRemark',
  deliverPortRemark: 'deliverPortRemark',
};

const emits = defineEmits<{ success: [] }>();

const batchIds = ref<Array<number | string>>([]);
const lanePreview = ref('');
/** 选港时记下自动带出的备注，提交时随对应港口 id 一起带上 */
const portRemarks = ref<Record<string, string>>({});

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
};

const buildBatchEditPayload = (
  ids: Array<number | string>,
  values: Record<string, unknown>,
): SeaExportAdminApi.SeaExportBatchEditDto | null => {
  const payload: Record<string, unknown> = { ids };

  const scalarFields = [
    'clientId',
    'shipAgentId',
    'bookingAgentId',
    'teamId',
    'insuranceId',
    'warehouseId',
    'yardId',
    'carrierId',
    'codeIssueTypeId',
    'codeFrtId',
    'prepareAtId',
    'codeServiceId',
    'tradeTermsType',
    'codeSourceId',
    'operationUserId',
    'documentationUserId',
    'customerServiceUserId',
    'saleUserId',
    'lanerUserId',
    'orgId',
  ] as const;

  for (const field of scalarFields) {
    const value = values[field];
    if (hasValue(value)) {
      payload[field] = value;
    }
  }

  const attachPort = (
    formIdField: string,
    payloadIdField: string,
    remarkFormField: string,
  ) => {
    if (!hasValue(values[formIdField])) return;
    payload[payloadIdField] = values[formIdField];
    const remark = portRemarks.value[remarkFormField];
    if (typeof remark === 'string' && remark.trim()) {
      payload[PORT_REMARK_TO_PAYLOAD[remarkFormField]] = remark.trim();
    }
  };

  attachPort('receivePortId', 'receivePortId', 'receivePortRemark');
  attachPort('polId', 'polId', 'polRemark');
  attachPort('poT1Id', 'pot1Id', 'poT1Remark');
  attachPort('poT2Id', 'pot2Id', 'poT2Remark');
  attachPort('podId', 'podId', 'podRemark');
  attachPort('deliverPortId', 'deliverPortId', 'deliverPortRemark');

  for (const field of ['vessel', 'innerVoyno'] as const) {
    const value = values[field];
    if (typeof value === 'string' && value.trim()) {
      payload[field] = value.trim();
    }
  }

  const editableKeys = Object.keys(payload).filter((key) => key !== 'ids');
  if (editableKeys.length === 0) {
    return null;
  }

  return payload as SeaExportAdminApi.SeaExportBatchEditDto;
};

const handlePodChange = (_value: unknown, option: unknown) => {
  const raw = pickPortSelectOption(option)?.raw as
    | { lane?: { laneName?: string } }
    | undefined;
  lanePreview.value = raw?.lane?.laneName ?? '';
};

const handlePortChange = (
  fieldName: string,
  value: unknown,
  option: unknown,
) => {
  if (fieldName === 'podId') {
    handlePodChange(value, option);
  }
  const remarkField = PORT_ID_TO_REMARK_FIELD[fieldName];
  if (!remarkField) return;
  portRemarks.value = {
    ...portRemarks.value,
    [remarkField]:
      formatSeaExportPortRemark(pickPortSelectOption(option)?.raw) ?? '',
  };
};

const formCommonConfig = {
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
    formItemClass: 'batch-edit-field',
  },
  layout: 'vertical' as const,
  showDefaultActions: false,
  wrapperClass: 'batch-edit-form-grid',
};

const [BasicForm, basicFormApi] = useVbenForm({
  ...formCommonConfig,
  schema: [
    createClientSelectSchema({
      fieldName: 'clientId',
      industryCategory: 'p',
      label: $t('seaExport.export.clientId'),
    }),
    {
      component: 'CarrierSelect',
      fieldName: 'carrierId',
      label: $t('seaExport.export.carrierId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'VesselVoyageInput',
      fieldName: 'vessel',
      label: $t('seaExport.export.vesselVoyage'),
      componentProps: (
        values: Record<string, unknown>,
        api: { setFieldValue: (field: string, value: unknown) => void },
      ) => ({
        formContext: api,
        secondFieldName: 'innerVoyno',
        secondFieldValue: values?.innerVoyno ?? '',
        mainRatio: 3,
        secondRatio: 2,
      }),
    },
    {
      component: 'Input',
      fieldName: 'innerVoyno',
      label: '',
      formItemClass: 'hidden',
      componentProps: { class: 'hidden' },
    },
    createClientSelectSchema({
      fieldName: 'shipAgentId',
      industryCategory: 'n',
      label: $t('seaExport.export.shipAgentId'),
    }),
    createClientSelectSchema({
      fieldName: 'bookingAgentId',
      industryCategory: 'o',
      label: $t('seaExport.export.bookingAgentId'),
    }),
    createClientSelectSchema({
      fieldName: 'teamId',
      industryCategory: 'i',
      label: $t('seaExport.export.teamId'),
    }),
    createClientSelectSchema({
      fieldName: 'insuranceId',
      industryCategory: 'r',
      label: $t('seaExport.export.insuranceId'),
    }),
    createClientSelectSchema({
      fieldName: 'warehouseId',
      industryCategory: 'q',
      label: $t('seaExport.export.warehouseId'),
    }),
    createClientSelectSchema({
      fieldName: 'yardId',
      industryCategory: 'c',
      label: $t('seaExport.export.yardId'),
    }),
    {
      component: 'CodeIssueTypeSelect',
      fieldName: 'codeIssueTypeId',
      label: $t('seaExport.export.issueType'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'FrtPrepareInput',
      fieldName: 'codeFrtId',
      label: `${$t('seaExport.export.codeFrtId')}/${$t('seaExport.export.prepareAtId')}`,
      componentProps: (
        values: Record<string, unknown>,
        api: { setFieldValue: (field: string, value: unknown) => void },
      ) => ({
        formContext: api,
        secondFieldName: 'prepareAtId',
        secondFieldValue: values?.prepareAtId ?? undefined,
        frtProps: {
          allowClear: true,
          placeholder: $t('ui.placeholder.select'),
        },
        prepareProps: {
          allowClear: true,
          placeholder: $t('ui.placeholder.select'),
        },
      }),
    },
    {
      component: 'PortSelect',
      fieldName: 'prepareAtId',
      label: $t('seaExport.export.prepareAtId'),
      componentProps: {
        allowClear: true,
        labelKey: 'ediCode',
        placeholder: $t('ui.placeholder.select'),
      },
      formItemClass: 'hidden',
    },
    {
      component: 'ServiceTradeTermsInput',
      fieldName: 'codeServiceId',
      label: `${$t('seaExport.export.codeServiceId')}/${$t('seaExport.export.tradeTermsType')}`,
      componentProps: (
        values: Record<string, unknown>,
        api: { setFieldValue: (field: string, value: unknown) => void },
      ) => ({
        formContext: api,
        secondFieldName: 'tradeTermsType',
        secondFieldValue: values?.tradeTermsType ?? undefined,
        serviceProps: {
          allowClear: true,
          placeholder: $t('ui.placeholder.select'),
        },
        tradeTermsOptions: getTradeTermsTypeOptions(),
        tradeTermsProps: {
          allowClear: true,
          placeholder: $t('ui.placeholder.select'),
        },
      }),
    },
    {
      component: 'Select',
      fieldName: 'tradeTermsType',
      label: $t('seaExport.export.tradeTermsType'),
      componentProps: {
        allowClear: true,
        options: getTradeTermsTypeOptions(),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
      formItemClass: 'hidden',
    },
    {
      component: 'CodeSourceSelect',
      fieldName: 'codeSourceId',
      label: $t('seaExport.export.codeSourceId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ],
});

const [PortForm, portFormApi] = useVbenForm({
  ...formCommonConfig,
  schema: [
    {
      component: 'PortSelect',
      fieldName: 'receivePortId',
      label: $t('seaExport.export.receivePortId'),
      componentProps: buildPortSelectProps('receivePortId', handlePortChange),
    },
    {
      component: 'PortSelect',
      fieldName: 'polId',
      label: $t('seaExport.export.polId'),
      componentProps: buildPortSelectProps('polId', handlePortChange),
    },
    {
      component: 'PortSelect',
      fieldName: 'poT1Id',
      label: $t('seaExport.export.batchEditPoT1'),
      componentProps: buildPortSelectProps('poT1Id', handlePortChange),
    },
    {
      component: 'PortSelect',
      fieldName: 'poT2Id',
      label: $t('seaExport.export.batchEditPoT2'),
      componentProps: buildPortSelectProps('poT2Id', handlePortChange),
    },
    {
      component: 'PortSelect',
      fieldName: 'podId',
      label: $t('seaExport.export.podId'),
      componentProps: buildPortSelectProps('podId', handlePortChange),
    },
    {
      component: 'PortSelect',
      fieldName: 'deliverPortId',
      label: $t('seaExport.export.deliverPortId'),
      componentProps: buildPortSelectProps('deliverPortId', handlePortChange),
    },
  ],
});

const [StakeholderForm, stakeholderFormApi] = useVbenForm({
  ...formCommonConfig,
  schema: [
    {
      component: 'UserSelect',
      fieldName: 'operationUserId',
      label: $t('system.user.userAttributeOptions.operation'),
      componentProps: {
        allowClear: true,
        userAttribute: UserAttribute.Operation,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'documentationUserId',
      label: $t('system.user.userAttributeOptions.documentation'),
      componentProps: {
        allowClear: true,
        userAttribute: UserAttribute.Documentation,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'customerServiceUserId',
      label: $t('system.user.userAttributeOptions.customerService'),
      componentProps: {
        allowClear: true,
        userAttribute: UserAttribute.CustomerService,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'saleUserId',
      label: $t('system.user.userAttributeOptions.sales'),
      componentProps: {
        allowClear: true,
        userAttribute: UserAttribute.Sales,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'lanerUserId',
      label: $t('system.user.userAttributeOptions.shippingLine'),
      componentProps: {
        allowClear: true,
        userAttribute: UserAttribute.ShippingLine,
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'UserOrgSelect',
      fieldName: 'orgId',
      label: $t('seaExport.export.batchEditOrgId'),
      componentProps: (values: Record<string, unknown>) => ({
        userId: values?.saleUserId ?? undefined,
        autoDefault: false,
        clearOnUserChange: true,
        placeholder: $t('ui.placeholder.select'),
      }),
    },
  ],
});

const modalTitle = computed(() =>
  $t('seaExport.export.batchEditBusinessTitle', [batchIds.value.length]),
);

const resetAllForms = async () => {
  await Promise.all([
    basicFormApi.resetForm(),
    portFormApi.resetForm(),
    stakeholderFormApi.resetForm(),
  ]);
};

const submitBatchEdit = async () => {
  const [basicValues, portValues, stakeholderValues] = await Promise.all([
    basicFormApi.getValues(),
    portFormApi.getValues(),
    stakeholderFormApi.getValues(),
  ]);
  const values = {
    ...basicValues,
    ...portValues,
    ...stakeholderValues,
  };
  const payload = buildBatchEditPayload(batchIds.value, values);
  if (!payload) {
    message.warning($t('seaExport.export.batchEditNoField'));
    return;
  }

  const doSubmit = async () => {
    modalApi.lock();
    try {
      await batchEditSeaExport(payload);
      message.success($t('seaExport.export.batchEditSuccess'));
      emits('success');
      modalApi.close();
    } catch {
      modalApi.unlock();
    }
  };

  if (hasValue(portValues.polId)) {
    Modal.confirm({
      title: $t('seaExport.export.batchEditPolConfirmTitle'),
      content: $t('seaExport.export.batchEditPolConfirmContent'),
      onOk: doSubmit,
    });
    return;
  }

  await doSubmit();
};

const [ModalComponent, modalApi] = useVbenModal({
  async onConfirm() {
    await submitBatchEdit();
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      lanePreview.value = '';
      portRemarks.value = {};
      return;
    }

    const data = modalApi.getData<{ ids?: Array<number | string> }>();
    batchIds.value = data?.ids ?? [];
    lanePreview.value = '';
    portRemarks.value = {};
    await resetAllForms();
  },
  closeOnClickModal: false,
});
</script>

<template>
  <ModalComponent
    :title="modalTitle"
    class="sea-export-batch-edit-modal w-[1180px]"
  >
    <div class="batch-edit">
      <header class="batch-edit__hero">
        <div class="batch-edit__hero-main">
          <span class="batch-edit__hero-icon" aria-hidden="true">
            <IconifyIcon icon="mdi:playlist-edit" />
          </span>
          <p class="batch-edit__hero-sub">
            {{ $t('seaExport.export.batchEditHint') }}
          </p>
        </div>
        <span class="batch-edit__count-chip">
          {{ $t('seaExport.export.batchEditSelectedCount', [batchIds.length]) }}
        </span>
      </header>

      <section class="form-section">
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon">
              <IconifyIcon
                icon="mdi:card-account-details-outline"
                class="size-4"
              />
            </div>
            <span class="section-title-text">
              {{ $t('seaExport.export.batchEditSectionBasic') }}
            </span>
            <span class="section-hint">
              {{ $t('seaExport.export.batchEditSectionHint') }}
            </span>
          </div>
        </header>
        <div class="section-body section-body--form">
          <BasicForm />
        </div>
      </section>

      <section class="form-section">
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon icon-teal">
              <IconifyIcon icon="mdi:anchor" class="size-4" />
            </div>
            <span class="section-title-text">
              {{ $t('seaExport.export.batchEditSectionPort') }}
            </span>
            <span class="section-hint">
              {{ $t('seaExport.export.batchEditSectionHint') }}
            </span>
          </div>
          <div v-if="lanePreview" class="batch-edit__lane-chip">
            <IconifyIcon icon="mdi:routes" class="size-3.5" />
            <span class="batch-edit__lane-label">
              {{ $t('seaExport.export.laneName') }}
            </span>
            <span class="batch-edit__lane-value">{{ lanePreview }}</span>
          </div>
        </header>
        <div class="section-body section-body--form">
          <PortForm />
        </div>
      </section>

      <section class="form-section">
        <header class="section-header">
          <div class="section-title">
            <div class="section-title-icon icon-violet">
              <IconifyIcon icon="mdi:account-group-outline" class="size-4" />
            </div>
            <span class="section-title-text">
              {{ $t('seaExport.export.batchEditSectionStakeholder') }}
            </span>
            <span class="section-hint">
              {{ $t('seaExport.export.batchEditSectionHint') }}
            </span>
          </div>
        </header>
        <div class="section-body section-body--form">
          <StakeholderForm />
        </div>
      </section>
    </div>
  </ModalComponent>
</template>

<style scoped>
.batch-edit {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 4px 8px;
}

.batch-edit__hero {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 12%) 0%,
    hsl(var(--primary) / 4%) 55%,
    #fff 100%
  );
  border: 1px solid hsl(var(--primary) / 22%);
  border-radius: 12px;
  box-shadow: 0 2px 8px hsl(var(--primary) / 8%);
}

.batch-edit__hero-main {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.batch-edit__hero-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: hsl(var(--primary));
  background: #fff;
  border: 1px solid hsl(var(--primary) / 20%);
  border-radius: 10px;
}

.batch-edit__hero-sub {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.batch-edit__count-chip {
  display: inline-flex;
  flex-shrink: 0;
  gap: 4px;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border: 1px solid hsl(var(--primary) / 25%);
  border-radius: 999px;
}

.form-section {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
  transition: box-shadow 0.25s ease;
}

.form-section:hover {
  box-shadow: 0 4px 14px rgb(16 42 83 / 8%);
}

.section-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 10px 14px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 55%,
    hsl(var(--background)) 100%
  );
  border-bottom: 1px solid #e4e8ef;
}

.section-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.section-title-icon {
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

.section-title-icon.icon-teal {
  color: #0d9488;
  background: #e6fffa;
}

.section-title-icon.icon-violet {
  color: #4f46e5;
  background: #eef2ff;
}

.section-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #252a31;
}

.section-hint {
  font-size: 12px;
  color: #9aa3af;
}

.section-body {
  padding: 14px 16px 16px;
}

.batch-edit__lane-chip {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  color: #0d9488;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 999px;
}

.batch-edit__lane-label {
  color: #64748b;
}

.batch-edit__lane-value {
  font-weight: 600;
  color: #0f766e;
}

:deep(.batch-edit-form-grid) {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
}

:deep(.batch-edit-field) {
  margin-bottom: 0;
}

.section-body--form :deep(.ant-form) {
  margin-bottom: 0;
}

.section-body--form :deep(.ant-form-item) {
  margin-bottom: 10px;
}

.section-body--form :deep(.ant-form-item-label > label) {
  height: auto;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  color: #64748b;
}

.section-body--form :deep(.ant-select),
.section-body--form :deep(.ant-picker),
.section-body--form :deep(.ant-input-number),
.section-body--form :deep(.ant-input-affix-wrapper),
.section-body--form :deep(.ant-input:not(textarea)) {
  width: 100% !important;
}

.section-body--form :deep(.ant-select-selector),
.section-body--form :deep(.ant-input),
.section-body--form :deep(.ant-input-affix-wrapper) {
  border-radius: 8px;
}

@media (max-width: 900px) {
  .batch-edit__hero {
    flex-direction: column;
    align-items: stretch;
  }

  :deep(.batch-edit-form-grid) {
    grid-template-columns: 1fr;
  }
}
</style>
