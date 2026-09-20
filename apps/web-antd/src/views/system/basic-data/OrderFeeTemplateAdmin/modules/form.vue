<script lang="ts" setup>
/**
 * 自动费用模板新建弹窗（费用页「生成模板」预填创建）。
 * 单层滚动：内容自然撑开，仅 Handsontable 区内滚。
 */
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';
import type { OrderFeeTemplateDraft } from '#/views/_shared/order-fee/modules/utils/build-fee-template-draft';

import { nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { addOrderFeeTemplate } from '#/api/sea-export/order-fee-template-admin';
import { getFeeCodeListAsync } from '#/api/system/base-data/fee-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import { loadSeServiceTypeOptions } from '#/views/sea-export-admin/service-type';
import { Button, Card, message } from 'ant-design-vue';

import { getFormSchema } from './data';
import OrderFeeTemplateTable from './order-fee-template-table.vue';
import { useDropdownSources } from './composables/useDropdownSources';

const emit = defineEmits<{ success: [] }>();

const loading = ref(false);
const feeItems = ref<OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto[]>([]);
const hotTableRef = ref<InstanceType<typeof OrderFeeTemplateTable>>();
const dropdownSources = useDropdownSources();

const [Form, formApi] = useVbenForm({
  schema: getFormSchema(),
  layout: 'horizontal',
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 100,
    wrapperClass: 'gap-x-3 gap-y-3',
  },
  wrapperClass: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
});

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null || id === '') return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

function resolveHotInstance(): any {
  const hotInstanceRef = hotTableRef.value?.hotInstance;
  if (!hotInstanceRef) return null;
  if (typeof hotInstanceRef === 'object' && 'value' in hotInstanceRef) {
    return (hotInstanceRef as any).value;
  }
  return hotInstanceRef;
}

async function loadDropdownData() {
  // 与费用录入一致：全量已启用费用代码，value 保持原始 id（勿 Number），避免对不上显示成数字
  const [feeCodeData, currencyResult] = await Promise.all([
    getFeeCodeListAsync(),
    getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 100,
    }),
  ]);

  if (feeCodeData && Array.isArray(feeCodeData)) {
    dropdownSources.feeCodeList.value = feeCodeData.map((item: any) => {
      const surLabel = item.cnName || item.enName || '';
      const label = item.code ? `${item.code}-${surLabel}` : surLabel;
      return {
        label: label || item.cnName || item.enName || item.code || '',
        value: item.id,
        currencyId: item.currencyId,
        unit: item.defaultUnitName || undefined,
        taxRate: item.taxRate !== undefined ? Number(item.taxRate) : undefined,
        defaultCreditName: item.defaultCreditName || undefined,
        defaultDebitName: item.defaultDebitName || undefined,
      };
    });
  }

  if (currencyResult?.items) {
    dropdownSources.currencyList.value = currencyResult.items.map(
      (item: any) => ({
        label: item.code || item.cnName || item.enName || '',
        value: item.id,
      }),
    );
  }

  await Promise.all([
    dropdownSources.loadAllClients(),
    dropdownSources.loadCtnCodeList(),
  ]);

  const serviceTypeOptions = await loadSeServiceTypeOptions();
  formApi.updateSchema([
    {
      fieldName: 'serviceType',
      componentProps: { options: serviceTypeOptions },
    },
  ]);
}

async function applyDraft(draft: OrderFeeTemplateDraft) {
  const { header, items, display } = draft;
  feeItems.value = JSON.parse(JSON.stringify(items));

  await formApi.setValues({
    name: header.name,
    bizType: header.bizType ?? 0,
    paySide: header.paySide ?? 0,
    efficient: header.efficient ?? true,
    startTime: header.startTime,
    endTime: header.endTime,
    clientId: header.clientId,
    tradeTermsType: header.tradeTermsType,
    cargoId: header.cargoId,
    carrierId: header.carrierId,
    bookingAgentId: header.bookingAgentId,
    polId: header.polId,
    podId: header.podId,
    blType: header.blType,
    serviceType: header.serviceType,
    sortId: header.sortId ?? 0,
    remark: header.remark,
  });

  formApi.updateSchema([
    {
      fieldName: 'clientId',
      componentProps: {
        selectedItems: toSelectedItems(header.clientId, display.clientName),
      },
    },
    {
      fieldName: 'bookingAgentId',
      componentProps: {
        selectedItems: toSelectedItems(
          header.bookingAgentId,
          display.bookingAgentName,
        ),
      },
    },
    {
      fieldName: 'carrierId',
      componentProps: {
        selectedItems: toSelectedItems(
          header.carrierId,
          display.carrierName,
          'cnName',
        ),
      },
    },
    {
      fieldName: 'polId',
      componentProps: {
        selectedItems: toSelectedItems(
          header.polId,
          display.polName,
          'portName',
        ),
      },
    },
    {
      fieldName: 'podId',
      componentProps: {
        selectedItems: toSelectedItems(
          header.podId,
          display.podName,
          'portName',
        ),
      },
    },
  ]);

  await nextTick();
  hotTableRef.value?.updateData?.(feeItems.value);
}

function resetState() {
  feeItems.value = [];
  formApi.resetForm();
}

function handleAddRow() {
  const hotInstance = resolveHotInstance();
  if (!hotInstance || hotInstance.isDestroyed) {
    message.warning('表格未初始化');
    return;
  }
  const rowCount = hotInstance.countRows();
  if (rowCount === 0) {
    hotInstance.alter('insert_row_above', 0, 1);
  } else {
    hotInstance.alter('insert_row_below', rowCount - 1, 1);
  }
  const newRowCount = hotInstance.countRows();
  hotInstance.setDataAtRowProp(newRowCount - 1, 'sortId', newRowCount);
  hotTableRef.value?.syncDataToParent?.();
}

function handleDeleteSelectedRows() {
  const selectedRowsSet = hotTableRef.value?.selectedRows as
    | Set<number>
    | undefined;
  if (!selectedRowsSet || selectedRowsSet.size === 0) {
    message.warning('请先选中要删除的行');
    return;
  }
  const hotInstance = resolveHotInstance();
  if (!hotInstance || hotInstance.isDestroyed) {
    message.warning('表格实例无效');
    return;
  }
  const sortedRows = [...selectedRowsSet].sort((a, b) => b - a);
  sortedRows.forEach((rowIndex) => {
    hotInstance.alter('remove_row', rowIndex, 1);
  });
  selectedRowsSet.clear();
  hotTableRef.value?.syncDataToParent?.();
  message.success(`已删除 ${sortedRows.length} 行`);
}

async function handleSubmit() {
  const valid = await formApi.validate();
  if (!valid) {
    message.warning('请填写必填项');
    return false;
  }

  hotTableRef.value?.syncDataToParent?.();

  if (!feeItems.value.length) {
    message.warning('请至少添加一条费用明细');
    return false;
  }

  for (let i = 0; i < feeItems.value.length; i++) {
    const item = feeItems.value[i];
    if (!item) continue;
    const rowNum = i + 1;
    if (!item.feeCodeId) {
      message.error(`第${rowNum}行：费用代码不能为空`);
      return false;
    }
    if (!item.currencyId) {
      message.error(`第${rowNum}行：币别不能为空`);
      return false;
    }
    if (
      item.unitPrice === null ||
      item.unitPrice === undefined ||
      item.unitPrice <= 0
    ) {
      message.error(`第${rowNum}行：含税单价不能为空且必须大于0`);
      return false;
    }
    if (!item.unit) {
      message.error(`第${rowNum}行：单位不能为空`);
      return false;
    }
    if (item.taxRate === null || item.taxRate === undefined) {
      message.error(`第${rowNum}行：税率不能为空`);
      return false;
    }
  }

  const formValues = await formApi.getValues();
  loading.value = true;
  try {
    const dto: OrderFeeTemplateAdminApi.OrderFeeTemplateAddDto = {
      name: formValues.name,
      bizType: formValues.bizType,
      paySide: formValues.paySide,
      efficient: formValues.efficient,
      startTime: formValues.startTime,
      endTime: formValues.endTime,
      clientId: formValues.clientId,
      tradeTermsType: formValues.tradeTermsType,
      cargoId: formValues.cargoId,
      carrierId: formValues.carrierId,
      bookingAgentId: formValues.bookingAgentId,
      polId: formValues.polId,
      podId: formValues.podId,
      blType: formValues.blType,
      serviceType: formValues.serviceType,
      sortId: formValues.sortId,
      remark: formValues.remark,
      orderFeeTemplateItems: feeItems.value,
    };
    await addOrderFeeTemplate(dto);
    message.success('模板已生成');
    emit('success');
    return true;
  } catch (error) {
    console.error('[OrderFeeTemplateForm] 保存失败:', error);
    message.error('保存模板失败');
    return false;
  } finally {
    loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  title: '新建自动费用模板',
  class: 'w-[1400px]',
  confirmText: '保存模板',
  cancelText: '取消',
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      resetState();
      return;
    }
    loading.value = true;
    try {
      await loadDropdownData();
      const data = modalApi.getData<{ draft?: OrderFeeTemplateDraft }>();
      if (data?.draft) {
        await applyDraft(data.draft);
      }
    } catch (error) {
      console.error('[OrderFeeTemplateForm] 打开失败:', error);
      message.error('加载模板编辑器失败');
    } finally {
      loading.value = false;
    }
  },
  onConfirm: async () => {
    const ok = await handleSubmit();
    // 校验/保存失败时阻止默认关闭
    if (!ok) {
      return false;
    }
    modalApi.close();
  },
});

defineExpose({ modalApi });
</script>

<template>
  <Modal>
    <div v-loading="loading" class="order-fee-template-modal-body">
      <Card title="匹配条件" class="mb-4" size="small">
        <Form />
      </Card>

      <Card size="small">
        <template #title>
          <div class="flex items-center justify-between gap-2">
            <span>费用明细</span>
            <div class="space-x-2">
              <Button size="small" type="primary" @click="handleAddRow">
                新增行
              </Button>
              <Button size="small" danger @click="handleDeleteSelectedRows">
                删除选中行
              </Button>
            </div>
          </div>
        </template>
        <div class="modal-fee-table-wrap">
          <OrderFeeTemplateTable
            ref="hotTableRef"
            v-model:data-source="feeItems"
            :dropdown-sources="dropdownSources"
            :all-clients-by-industry="
              dropdownSources.allClientsByIndustry.value
            "
            :form-api="formApi"
          />
        </div>
      </Card>
    </div>
  </Modal>
</template>

<style scoped>
.order-fee-template-modal-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 2px 4px 20px;
}

:deep(.ant-card-body) {
  padding: 12px;
}

/* Handsontable 允许一处内层滚动；外层交给 Modal 内容区 */
.modal-fee-table-wrap {
  display: flex;
  flex-direction: column;
  height: 420px;
  min-height: 280px;
  overflow: hidden;
}
</style>
