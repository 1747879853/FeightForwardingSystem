<script lang="ts" setup>
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

import { ref, onMounted, nextTick, computed } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import {
  addOrderFeeTemplate,
  editOrderFeeTemplate,
  getOrderFeeTemplateDetail,
} from '#/api/sea-export/order-fee-template-admin';
// ✅ 新增：导入费用代码、币别和客户API
import { getFeeCodeListAsync } from '#/api/system/base-data/fee-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import {
  getClientPagedList,
  getClientGroupedByIndustryCategory,
} from '#/api/common/client';
import { $t } from '#/locales';
import { Button, message, Tabs, Card } from 'ant-design-vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';
import FeeCodeSelect from '#/adapter/component/biz-select/fee-code-select.vue';
// ✅ 新增：引入 Handsontable 组件和 composables
import OrderFeeTemplateTable from './order-fee-template-table.vue';
import { useDropdownSources } from './composables/useDropdownSources';
// ✅ 新增：导入表单schema和枚举定义
import { getFormSchema } from './data';

const emit = defineEmits(['success']);

// ==================== 状态定义 ====================

const mode = ref<'create' | 'edit'>('create');
const templateId = ref<string>('');
const loading = ref(false);
const clientsLoading = ref(false); // ✅ 新增：客户数据加载状态

// ✅ 关键修复：保存前的数据快照，用于失败时恢复
const previousFeeItems = ref<
  OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto[]
>([]);

// ✅ 使用 composables 管理下拉数据源
const dropdownSources = useDropdownSources();

// ✅ 新增：用于接收从父组件传递的下拉数据（与dropdownSources结构相同）
const dropdownData = {
  feeCodeList: dropdownSources.feeCodeList,
  currencyList: dropdownSources.currencyList,
  clientListByIndustry: dropdownSources.clientListByIndustry,
  allClientsByIndustry: dropdownSources.allClientsByIndustry,
};

// ✅ 费用明细数据（使用响应式数组）
const feeItems = ref<OrderFeeTemplateAdminApi.OrderFeeTemplateItemAddDto[]>([]);

// ✅ Handsontable 组件引用
const hotTableRef = ref<InstanceType<typeof OrderFeeTemplateTable>>();

// ==================== 表单配置 ====================

const [Form, formApi] = useVbenForm({
  schema: getFormSchema(),
  layout: 'horizontal',
  showDefaultActions: false,
  commonConfig: {
    labelWidth: 90,
    wrapperClass: 'gap-x-1 gap-y-3',
  },
  wrapperClass: 'grid-cols-4',
});

// ==================== 模态框逻辑 ====================

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = modalApi.getData<any>();
      mode.value = data.mode;
      templateId.value = data.id || '';

      // ✅ 关键修改：使用从列表页面传递的下拉数据，而不是重新加载
      if (data.dropdownData) {
        console.log('✅ [form.vue] 使用父组件传递的下拉数据');
        dropdownData.feeCodeList.value = data.dropdownData.feeCodeList || [];
        dropdownData.currencyList.value = data.dropdownData.currencyList || [];
        dropdownData.clientListByIndustry.value =
          data.dropdownData.clientListByIndustry || {};

        // ✅ 关键修复：接收 allClientsByIndustry 数据（用于结算对象下拉框）
        if (
          data.dropdownData.allClientsByIndustry &&
          Object.keys(data.dropdownData.allClientsByIndustry).length > 0
        ) {
          dropdownData.allClientsByIndustry.value =
            data.dropdownData.allClientsByIndustry;
          console.log(
            `✅ [form.vue] 全部客户缓存加载完成，共 ${Object.keys(dropdownData.allClientsByIndustry.value).length} 个行业类别`,
          );
        } else {
          console.warn('⚠️ [form.vue] 未接收到 allClientsByIndustry 数据');
        }

        console.log(
          `📊 [form.vue] 费用代码数量: ${dropdownData.feeCodeList.value.length}`,
        );
        console.log(
          `📊 [form.vue] 币别数量: ${dropdownData.currencyList.value.length}`,
        );
        console.log(
          `📊 [form.vue] 客户行业类别:`,
          Object.keys(dropdownData.clientListByIndustry.value),
        );
      } else {
        console.warn('⚠️ [form.vue] 未接收到下拉数据，将尝试重新加载');
        // 兜底：如果没有传递数据，则重新加载（理论上不应该发生）
        await loadDropdownData();
      }

      // 重置表单
      await formApi.resetForm();

      // ✅ 删除：不再在弹窗中加载下拉数据
      // await loadDropdownData();

      // 如果是编辑模式，加载详情
      if (mode.value === 'edit' && templateId.value) {
        await loadDetail();
      } else {
        // 新建模式，初始化空的费用明细
        feeItems.value = [];
        // 初始化表格会在 nextTick 后由组件自身完成
        await nextTick();
      }
    } else {
      // 关闭时由子组件自行销毁 Handsontable
    }
  },
  async onConfirm() {
    await handleSubmit();
  },
});

// ==================== 表格操作函数 ====================

/**
 * 新增一行
 */
function handleAddRow() {
  console.log('🔍 [handleAddRow] hotTableRef.value:', hotTableRef.value);
  console.log(
    '🔍 [handleAddRow] hotTableRef.value?.hotInstance:',
    hotTableRef.value?.hotInstance,
  );

  if (!hotTableRef.value?.hotInstance) {
    message.warning('表格未初始化');
    return;
  }

  // ✅ 关键修复：hotInstance 是一个 ref，需要访问 .value
  const hotInstanceRef = hotTableRef.value.hotInstance;
  console.log('🔍 [handleAddRow] hotInstanceRef 类型:', typeof hotInstanceRef);
  console.log(
    '🔍 [handleAddRow] hotInstanceRef 是否是 ref 对象:',
    hotInstanceRef &&
      typeof hotInstanceRef === 'object' &&
      'value' in hotInstanceRef,
  );

  // 检查 hotInstanceRef 是否是 ref 对象
  let hotInstance: any;
  if (
    hotInstanceRef &&
    typeof hotInstanceRef === 'object' &&
    'value' in hotInstanceRef
  ) {
    // 是 ref 对象，需要访问 .value
    hotInstance = hotInstanceRef.value;
    console.log('🔍 [handleAddRow] 从 ref.value 获取实例');
  } else {
    // 不是 ref 对象，直接使用
    hotInstance = hotInstanceRef;
    console.log('🔍 [handleAddRow] 直接使用实例');
  }

  console.log('🔍 [handleAddRow] hotInstance:', hotInstance);
  console.log('🔍 [handleAddRow] hotInstance 类型:', typeof hotInstance);

  // 检查实例是否有效
  if (!hotInstance || typeof hotInstance !== 'object') {
    console.error('❌ [handleAddRow] hotInstance 不是有效对象:', hotInstance);
    message.warning('表格实例无效');
    return;
  }

  // 检查实例是否已被销毁
  if (hotInstance.isDestroyed) {
    console.warn('⚠️ [handleAddRow] Handsontable 实例已被销毁');
    message.warning('表格实例已失效，请刷新页面');
    return;
  }

  try {
    const rowCount = hotInstance.countRows();
    console.log('📊 [handleAddRow] 当前行数:', rowCount);

    if (typeof hotInstance.alter === 'function') {
      console.log('✅ [handleAddRow] 使用 alter 方法添加行');

      // ✅ 关键修复：如果表格为空，使用 insert_row_above(0) 而不是 insert_row_below(-1)
      if (rowCount === 0) {
        console.log('📝 [handleAddRow] 表格为空，在第一行插入');
        hotInstance.alter('insert_row_above', 0, 1);
      } else {
        console.log('📝 [handleAddRow] 在最后一行下方插入');
        hotInstance.alter('insert_row_below', rowCount - 1, 1);
      }

      // ✅ 关键修复：验证行是否真的添加了
      const newRowCount = hotInstance.countRows();
      console.log('📊 [handleAddRow] 添加后行数:', newRowCount);

      if (newRowCount === rowCount) {
        console.warn('⚠️ [handleAddRow] 行数没有变化，alter 可能失败');
        message.warning('新增行失败，请重试');
        return;
      }

      // ✅ 新增：为新行的排序字段设置默认值（当前行总数）
      const newRowIdx = newRowCount - 1; // 新行的索引
      hotInstance.setDataAtRowProp(newRowIdx, 'sortId', newRowCount);
      console.log('✅ [handleAddRow] 设置排序默认值:', newRowCount);
    } else {
      console.log('✅ [handleAddRow] 使用 loadData 方法添加行');
      const currentData = hotInstance.getData();
      console.log('📊 [handleAddRow] 当前数据行数:', currentData.length);

      const emptyRow = new Array(hotInstance.countCols()).fill(null);
      currentData.push(emptyRow);

      hotInstance.loadData(currentData);

      // ✅ 关键修复：验证行是否真的添加了
      const newData = hotInstance.getData();
      console.log('📊 [handleAddRow] 添加后数据行数:', newData.length);

      // ✅ 新增：为新行的排序字段设置默认值（当前行总数）
      const newRowIdx = newData.length - 1; // 新行的索引
      hotInstance.setDataAtRowProp(newRowIdx, 'sortId', newData.length);
      console.log('✅ [handleAddRow] 设置排序默认值:', newData.length);
    }

    // ✅ 关键修复：新增行后需要同步数据到父组件
    console.log('🔄 [handleAddRow] 开始同步数据到父组件...');

    // 检查实例是否仍然有效
    if (hotInstance.isDestroyed) {
      console.warn('⚠️ [handleAddRow] Handsontable 实例已被销毁，无法同步数据');
      message.warning('表格实例已失效，请刷新页面');
      return;
    }

    hotTableRef.value.syncDataToParent();

    message.success('已新增一行');
  } catch (error) {
    console.error('❌ [handleAddRow] 添加行失败:', error);
    message.error('添加行失败');
  }
}

/**
 * 删除选中的行
 */
function handleDeleteSelectedRows() {
  console.log(
    '🔍 [handleDeleteSelectedRows] hotTableRef.value:',
    hotTableRef.value,
  );

  if (!hotTableRef.value?.selectedRows) {
    message.warning('表格未初始化');
    return;
  }

  // ✅ 关键修复：使用 selectedRows ref
  const selectedRowsRef = hotTableRef.value.selectedRows;
  const selectedRowsSet = selectedRowsRef as Set<number>;

  console.log(
    '📊 [handleDeleteSelectedRows] 当前选中的行:',
    Array.from(selectedRowsSet),
  );

  if (selectedRowsSet.size === 0) {
    message.warning('请先选中要删除的行（点击行号或拖动选择）');
    return;
  }

  // 按降序排序，从后往前删除，避免索引变化
  const sortedRows = Array.from(selectedRowsSet).sort((a, b) => b - a);

  console.log('🗑️ [handleDeleteSelectedRows] 待删除的行索引:', sortedRows);

  // 获取 Handsontable 实例
  const hotInstanceRef = hotTableRef.value.hotInstance;
  let hotInstance: any;
  if (
    hotInstanceRef &&
    typeof hotInstanceRef === 'object' &&
    'value' in hotInstanceRef
  ) {
    hotInstance = hotInstanceRef.value;
  } else {
    hotInstance = hotInstanceRef;
  }

  // 检查实例是否有效
  if (!hotInstance || typeof hotInstance !== 'object') {
    console.error(
      '❌ [handleDeleteSelectedRows] hotInstance 不是有效对象:',
      hotInstance,
    );
    message.warning('表格实例无效');
    return;
  }

  // 检查实例是否已被销毁
  if (hotInstance.isDestroyed) {
    console.warn('⚠️ [handleDeleteSelectedRows] Handsontable 实例已被销毁');
    message.warning('表格实例已失效，请刷新页面');
    return;
  }

  try {
    sortedRows.forEach((rowIndex) => {
      // ✅ 关键修复：使用正确的API删除行
      if (typeof hotInstance.alter === 'function') {
        hotInstance.alter('remove_row', rowIndex, 1);
      } else {
        // 备用方法：直接操作数据源
        const currentData = hotInstance.getData();
        currentData.splice(rowIndex, 1);
        hotInstance.loadData(currentData);
      }
    });

    // 清空选中的行
    selectedRowsSet.clear();

    // ✅ 关键修复：删除行后需要同步数据到父组件
    console.log('🔄 [handleDeleteSelectedRows] 开始同步数据到父组件...');
    hotTableRef.value.syncDataToParent();

    message.success(`已删除 ${sortedRows.length} 行`);
  } catch (error) {
    console.error('❌ [handleDeleteSelectedRows] 删除行失败:', error);
    message.error('删除行失败');
  }
}

// ==================== 加载下拉数据源 ====================

async function loadDropdownData() {
  try {
    console.log('🔄 [loadDropdownData] 开始加载下拉数据...');

    // ✅ 1. 加载费用代码列表（使用真实API）
    const feeCodeData = await getFeeCodeListAsync({ isSea: true });
    console.log('📦 [loadDropdownData] API返回的原始数据:', feeCodeData);

    if (feeCodeData && Array.isArray(feeCodeData)) {
      dropdownSources.feeCodeList.value = feeCodeData.map((item: any) => {
        // ✅ 参考费用录入表格的格式：code-cnName
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;

        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: Number(item.id),
          currencyId: item.currencyId ? Number(item.currencyId) : undefined,
          unit: item.defaultUnit || undefined,
          taxRate:
            item.taxRate !== undefined ? Number(item.taxRate) : undefined,
        };
      });
      console.log(
        `✅ [loadDropdownData] 费用代码加载完成，共 ${dropdownSources.feeCodeList.value.length} 条`,
      );
      console.log(
        '📋 [loadDropdownData] 前3条费用代码示例:',
        dropdownSources.feeCodeList.value.slice(0, 3),
      );
    } else {
      console.warn(
        '⚠️ [loadDropdownData] 费用代码API返回数据异常:',
        feeCodeData,
      );
    }

    // ✅ 2. 加载币别列表（使用分页API）
    const currencyRes = await getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 100,
    });
    if (currencyRes?.items) {
      dropdownSources.currencyList.value = currencyRes.items.map(
        (item: any) => ({
          label: item.code || item.cnName || item.enName || '',
          value: Number(item.id),
        }),
      );
      console.log(
        `✅ [loadDropdownData] 币别加载完成，共 ${dropdownSources.currencyList.value.length} 条`,
      );
    }

    // ✅ 3. 加载客户列表（按行业类别分组）
    // 委托单位 (industryCategory: 'p')
    const clientDataP = await getClientPagedList({
      pageSize: 1000,
      pageIndex: 1,
      industryCategory: 'p' as any,
    });
    if (clientDataP?.items) {
      dropdownSources.clientListByIndustry.value['p'] = clientDataP.items.map(
        (item: any) => ({
          label: item.name || item.clientName || '',
          value: item.id,
        }),
      );
    }

    // 订舱代理 (industryCategory: 'o')
    const clientDataO = await getClientPagedList({
      pageSize: 1000,
      pageIndex: 1,
      industryCategory: 'o' as any,
    });
    if (clientDataO?.items) {
      dropdownSources.clientListByIndustry.value['o'] = clientDataO.items.map(
        (item: any) => ({
          label: item.name || item.clientName || '',
          value: item.id,
        }),
      );
    }

    // ✅ 4. 一次性加载全部客户数据（用于结算对象下拉框）
    console.log('🔄 [loadDropdownData] 开始加载全部客户缓存...');
    await dropdownSources.loadAllClients();
    console.log('✅ [loadDropdownData] 全部客户缓存加载完成');

    console.log('✅ [loadDropdownData] 所有下拉数据加载完成');
  } catch (error) {
    console.error('❌ [loadDropdownData] 加载失败:', error);
    message.error('加载下拉数据失败');
  }
}

// ==================== 加载详情 ====================

async function loadDetail() {
  loading.value = true;
  try {
    const detail = await getOrderFeeTemplateDetail(templateId.value);

    // 填充表单数据
    await formApi.setValues({
      name: detail.name,
      bizType: detail.bizType,
      paySide: detail.paySide,
      efficient: detail.efficient,
      startTime: detail.startTime,
      endTime: detail.endTime,
      clientId: detail.clientId,
      tradeTermsType: detail.tradeTermsType,
      cargoId: detail.cargoId,
      carrierId: detail.carrierId,
      bookingAgentId: detail.bookingAgentId,
      polId: detail.polId,
      podId: detail.podId,
      blType: detail.blType,
      serviceType: detail.serviceType,
      sortId: detail.sortId,
      remark: detail.remark,
    });

    // 填充费用明细
    feeItems.value =
      detail.orderFeeTemplateItems?.map((item) => ({
        serviceType: item.serviceType,
        feeCodeId: item.feeCodeId!,
        industryCategory: item.industryCategory!,
        settlementId: item.settlementId!,
        currencyId: item.currencyId!,
        unitPrice: item.unitPrice!,
        noTaxUnitPrice: item.noTaxUnitPrice!,
        unit: item.unit || '',
        taxRate: item.taxRate!,
        amount: item.amount,
        noTaxAmount: item.noTaxAmount,
        sortId: item.sortId,
        remark: item.remark,
      })) || [];

    // ✅ 关键修复：保存初始状态快照
    previousFeeItems.value = JSON.parse(JSON.stringify(feeItems.value));

    // 在 nextTick 中更新表格数据
    await nextTick();
    hotTableRef.value?.updateData(feeItems.value);
  } catch (error) {
    message.error('加载详情失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// ==================== 提交表单 ====================

async function handleSubmit() {
  try {
    // 验证表单
    const valid = await formApi.validate();
    if (!valid) {
      message.warning('请填写必填项');
      return;
    }

    // ✅ 从子组件同步数据（将 Label 转换为 ID）
    hotTableRef.value?.syncDataToParent();

    // ✅ 关键修复：在同步数据后保存快照，此时 feeItems.value 中是 ID 格式
    previousFeeItems.value = JSON.parse(JSON.stringify(feeItems.value));

    // 验证费用明细
    if (feeItems.value.length === 0) {
      message.warning('请至少添加一条费用明细');
      return;
    }

    // ✅ 新增：验证费用明细中的必填字段
    // 服务项(serviceType)、行业类别(industryCategory)、结算对象(settlementId)、备注(remark)可以为空
    // 其他字段：费用代码(feeCodeId)、币别(currencyId)、含税单价(unitPrice)、单位(unit)、税率(taxRate)为必填
    for (let i = 0; i < feeItems.value.length; i++) {
      const item = feeItems.value[i];
      if (!item) continue; // 跳过未定义的行

      const rowNum = i + 1;
      const errors: string[] = [];

      // 费用代码 - 必填
      if (!item.feeCodeId) {
        errors.push(`第${rowNum}行：费用代码不能为空`);
      }

      // 币别 - 必填
      if (!item.currencyId) {
        errors.push(`第${rowNum}行：币别不能为空`);
      }

      // 含税单价 - 必填
      if (
        item.unitPrice === null ||
        item.unitPrice === undefined ||
        item.unitPrice <= 0
      ) {
        errors.push(`第${rowNum}行：含税单价不能为空且必须大于0`);
      }

      // 单位 - 必填
      if (!item.unit) {
        errors.push(`第${rowNum}行：单位不能为空`);
      }

      // 税率 - 必填（可以为0，但不能为空）
      if (item.taxRate === null || item.taxRate === undefined) {
        errors.push(`第${rowNum}行：税率不能为空`);
      }

      // 如果有错误，显示第一个错误并返回
      if (errors.length > 0) {
        message.error(errors[0]);
        return;
      }
    }

    // 获取表单值
    const formValues = await formApi.getValues();

    loading.value = true;

    if (mode.value === 'create') {
      // 新建
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
      message.success('新建成功');
    } else {
      // 编辑
      const dto: OrderFeeTemplateAdminApi.OrderFeeTemplateEditDto = {
        id: templateId.value,
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
      await editOrderFeeTemplate(dto);
      message.success('编辑成功');
    }

    modalApi.close();
    emit('success');
  } catch (error) {
    // ✅ 关键修复：保存失败时恢复数据
    console.error('❌ [handleSubmit] 保存失败，恢复之前的数据:', error);

    // 恢复费用明细数据
    feeItems.value = JSON.parse(JSON.stringify(previousFeeItems.value));

    // ✅ 关键修复：恢复后需要重新渲染表格（将 ID 转换为 Label）
    await nextTick();
    hotTableRef.value?.updateData(feeItems.value);

    message.error(mode.value === 'create' ? '新建失败' : '编辑失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  // 无需加载枚举，已直接定义
});
</script>

<template>
  <Modal
    :title="mode === 'create' ? '新建自动费用模板' : '编辑自动费用模板'"
    class="order-fee-template-modal w-[1400px]"
  >
    <div v-loading="loading">
      <!-- 基础信息 -->
      <Card title="基础信息" class="mb-4">
        <Form />
      </Card>

      <!-- 费用明细 -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
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
        <OrderFeeTemplateTable
          ref="hotTableRef"
          v-model:data-source="feeItems"
          :dropdown-sources="dropdownSources"
          :all-clients-by-industry="dropdownSources.allClientsByIndustry.value"
          :form-api="formApi"
        />
      </Card>
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-card-body) {
  padding: 12px;
}

/* ✅ 关键修复：移除弹窗body的滚动条 */
:deep(.order-fee-template-modal .ant-modal-body) {
  max-height: none !important;
  padding: 12px;
  overflow: visible !important;
}
</style>
