<script lang="ts" setup>
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';
import { ref } from 'vue';
import { useVbenForm } from '#/adapter/form';
import { Button, message, Card } from 'ant-design-vue';
// ✅ 新增：引入 Handsontable 组件和 composables
import OrderFeeTemplateTable from './order-fee-template-table.vue';
import { useDropdownSources } from './composables/useDropdownSources';
// ✅ 新增：导入表单schema和枚举定义
import { getFormSchema } from './data';
const emit = defineEmits(['success']);
// ==================== 状态定义 ====================

const mode = ref<'create' | 'edit'>('create');
const loading = ref(false);

// ✅ 使用 composables 管理下拉数据源
const dropdownSources = useDropdownSources();

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

    // ✅ 关键修复：先获取当前表格中的Label数据（在转换之前）
    const currentData = hotInstance.getData();
    console.log('📊 [handleAddRow] 同步前表格数据行数:', currentData.length);

    // 同步数据到父组件（会将Label转换为ID）
    hotTableRef.value.syncDataToParent();

    // ✅ 关键修复：同步后，需要重新渲染表格以确保显示正确
    // 因为syncDataToParent会发出update:dataSource事件，父组件更新后可能会触发watch
    // 虽然watch会跳过ID格式数据的loadData，但为了确保renderer正确显示，我们手动触发render
    setTimeout(() => {
      if (hotInstance && !hotInstance.isDestroyed) {
        console.log('🔄 [handleAddRow] 重新渲染表格以确保显示正确');
        hotInstance.render();
      }
    }, 50);

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

    // ✅ 关键修复：同步后，需要重新渲染表格以确保显示正确
    setTimeout(() => {
      const hotInstanceRef = hotTableRef.value.hotInstance;
      let hotInstanceToRender: any;
      if (
        hotInstanceRef &&
        typeof hotInstanceRef === 'object' &&
        'value' in hotInstanceRef
      ) {
        hotInstanceToRender = hotInstanceRef.value;
      } else {
        hotInstanceToRender = hotInstanceRef;
      }

      if (hotInstanceToRender && !hotInstanceToRender.isDestroyed) {
        console.log('🔄 [handleDeleteSelectedRows] 重新渲染表格以确保显示正确');
        hotInstanceToRender.render();
      }
    }, 50);

    message.success(`已删除 ${sortedRows.length} 行`);
  } catch (error) {
    console.error('❌ [handleDeleteSelectedRows] 删除行失败:', error);
    message.error('删除行失败');
  }
}
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
