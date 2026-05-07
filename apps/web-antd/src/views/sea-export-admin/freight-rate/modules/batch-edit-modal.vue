<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  BatchEditSeFreiPriceInput,
  SeFreiPriceCtnEditDto,
  SeFreiPriceOutDto,
} from '#/api/sea-export/freight-rate-admin';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Button,
  message,
  Select,
  Space,
  InputNumber,
  Input,
  DatePicker,
  Switch,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import { getCtnCodePagedList as getBaseCtnCodes } from '#/api/system/base-data/ctn-code-admin';
import { batchEditSeFreiPrice } from '#/api/sea-export/freight-rate-admin';
import { $t } from '#/locales';

const emit = defineEmits<{
  success: [];
}>();

// 箱型列表（用于动态列）
interface CtnTypeOption {
  ctnCodeId: number;
  ctnName: string;
}

const addedCtnTypes = ref<CtnTypeOption[]>([]);

// 下拉选项数据
const allCtnOptions = ref<CtnTypeOption[]>([]);

// 表格数据 - 由 Grid 直接管理
let rowKeyCounter = 0;

// 选中的行 keys
const selectedRowKeys = ref<(string | number)[]>([]);

// 加载状态
const loading = ref(false);

// 原始选中的数据
const originalData = ref<SeFreiPriceOutDto[]>([]);

// [Modal, modalApi] 由父组件通过 connectedComponent 注入
const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm() {
    handleSubmit();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      // 打开时加载数据
      const data = modalApi.getData<any>();
      if (data?.rows && data.rows.length > 0) {
        originalData.value = data.rows;
        initializeTableData(data.rows);
      }
    }
  },
});

// 初始化下拉选项
async function loadSelectOptions() {
  try {
    const ctns = await getBaseCtnCodes({ PageIndex: 1, PageSize: 1000 });
    allCtnOptions.value =
      ctns?.items?.map((item) => ({
        ctnCodeId: item.id,
        ctnName: item.ctnName || '',
      })) || [];
  } catch (error) {
    console.error('加载箱型选项失败:', error);
    message.error('加载箱型选项失败');
  }
}

// 生成唯一行 key
function generateRowKey() {
  return `freight_${Date.now()}_${++rowKeyCounter}`;
}

// 初始化表格数据
async function initializeTableData(rows: SeFreiPriceOutDto[]) {
  // 等待下一个 tick，确保 Grid 已完全初始化
  await nextTick();

  // 清空现有状态
  addedCtnTypes.value = [];
  rowKeyCounter = 0;

  // 收集所有已存在的箱型
  const existingCtnTypes = new Map<number, string>();
  rows.forEach((row) => {
    if (row.seFreiPriceCtns) {
      row.seFreiPriceCtns.forEach((ctn) => {
        if (!existingCtnTypes.has(ctn.ctnCodeId)) {
          // ctnName 在 ctnCode 对象中
          existingCtnTypes.set(ctn.ctnCodeId, ctn.ctnCode?.ctnName || '');
        }
      });
    }
  });

  // 添加已存在的箱型到动态列
  existingCtnTypes.forEach((ctnName, ctnCodeId) => {
    addedCtnTypes.value.push({ ctnCodeId, ctnName });
  });

  // 等待列配置更新完成
  await nextTick();

  // 为每行创建表格数据并插入
  rows.forEach((row) => {
    const newRow = {
      _rowKey: generateRowKey(),
      id: row.id,
      recommend: row.recommend,
      carrierId: row.carrierId,
      polId: row.polId,
      podId: row.podId,
      isDirect: row.isDirect,
      poT1Id: row.poT1Id,
      poT2Id: row.poT2Id,
      freeDays: row.freeDays,
      voyage: row.voyage,
      etd: row.etd,
      closeDocTime: row.closeDocTime,
      closingTime: row.closingTime,
      validTimeStart: row.validTimeStart,
      validTimeEnd: row.validTimeEnd,
      remark: row.remark,
      currencyId: row.currencyId,
      seFreiPriceCtns: (row.seFreiPriceCtns || []).map((ctn) => ({
        ctnCodeId: ctn.ctnCodeId,
        cost: ctn.cost,
      })),
    };
    gridApi.grid?.insertAt(newRow, -1);
  });
}

// 添加箱型列
function handleAddCtnType(value: any) {
  if (!value) return;

  // 直接使用 value，不进行 Number 转换，避免大数精度丢失
  const ctnCodeId = value;

  // 检查是否已添加（使用字符串比较）
  if (
    addedCtnTypes.value.some(
      (ctn) => String(ctn.ctnCodeId) === String(ctnCodeId),
    )
  ) {
    message.warning('该箱型已添加');
    return;
  }

  // 使用字符串比较查找箱型
  const ctn = allCtnOptions.value.find(
    (c) => String(c.ctnCodeId) === String(ctnCodeId),
  );
  if (!ctn) {
    message.error('未找到箱型信息');
    return;
  }

  addedCtnTypes.value.push({ ...ctn });

  // 为所有行添加该箱型的空值 - 直接操作 Grid 中的数据
  const records = gridApi.grid?.getTableData()?.fullData || [];
  records.forEach((row: any) => {
    row.seFreiPriceCtns.push({
      ctnCodeId: ctn.ctnCodeId,
      cost: undefined, // 初始值为 undefined，由用户输入
    });
  });

  message.success('添加箱型成功');
}

// 获取可用的箱型选项（排除已添加的）
const availableCtnOptions = computed(() => {
  const addedIds = new Set(addedCtnTypes.value.map((c) => String(c.ctnCodeId)));
  return allCtnOptions.value.filter((c) => !addedIds.has(String(c.ctnCodeId)));
});

// 获取某行的箱型成本
function getCtnCost(row: any, ctnCodeId: any): number | undefined {
  if (!row || !row.seFreiPriceCtns) return undefined;

  const ctnData = row.seFreiPriceCtns.find(
    (c: any) => String(c.ctnCodeId) === String(ctnCodeId),
  );
  return ctnData?.cost;
}

// 设置某行的箱型成本
function setCtnCost(row: any, ctnCodeId: any, cost: number | undefined) {
  if (!row || !row.seFreiPriceCtns) return;

  // 使用字符串比较查找箱型数据，避免大数精度丢失
  const ctnIndex = row.seFreiPriceCtns.findIndex(
    (c: any) => String(c.ctnCodeId) === String(ctnCodeId),
  );

  if (ctnIndex !== -1) {
    // 如果找到了，直接更新 cost
    row.seFreiPriceCtns[ctnIndex].cost = cost;
  } else {
    // 如果没找到，添加新的箱型数据
    row.seFreiPriceCtns.push({
      ctnCodeId,
      cost,
    });
  }
}

// 构建动态列配置
function buildColumns(): VxeTableGridOptions['columns'] {
  const columns: any[] = [
    {
      field: 'carrierId',
      title: '船公司',
      width: 150,
      slots: { default: 'carrierId' },
    },
    {
      field: 'polId',
      title: '起运港',
      width: 120,
      slots: { default: 'polId' },
    },
    {
      field: 'podId',
      title: '目的港',
      width: 120,
      slots: { default: 'podId' },
    },
    {
      field: 'currencyId',
      title: '币别',
      width: 100,
      slots: { default: 'currencyId' },
    },
    {
      field: 'isDirect',
      title: '是否直达',
      width: 100,
      slots: { default: 'isDirect' },
    },
    {
      field: 'poT1Id',
      title: '中转港1',
      width: 120,
      slots: { default: 'poT1Id' },
    },
    {
      field: 'poT2Id',
      title: '中转港2',
      width: 120,
      slots: { default: 'poT2Id' },
    },
    {
      field: 'freeDays',
      title: '免用箱天数',
      width: 120,
      slots: { default: 'freeDays' },
    },
    {
      field: 'voyage',
      title: '航程',
      width: 120,
      slots: { default: 'voyage' },
    },
    {
      field: 'etd',
      title: '开船日期',
      width: 150,
      slots: { default: 'etd' },
    },
    {
      field: 'closeDocTime',
      title: '截单时间',
      width: 150,
      slots: { default: 'closeDocTime' },
    },
    {
      field: 'closingTime',
      title: '截港时间',
      width: 150,
      slots: { default: 'closingTime' },
    },
    {
      field: 'validTimeStart',
      title: '有效起始日期',
      width: 150,
      slots: { default: 'validTimeStart' },
    },
    {
      field: 'validTimeEnd',
      title: '有效截止日期',
      width: 150,
      slots: { default: 'validTimeEnd' },
    },
    {
      field: 'remark',
      title: '备注',
      width: 200,
      slots: { default: 'remark' },
    },
  ];

  // 添加动态箱型列
  addedCtnTypes.value.forEach((ctn) => {
    columns.push({
      field: `ctn_${String(ctn.ctnCodeId)}`,
      title: ctn.ctnName,
      width: 120,
      align: 'right',
      slots: { default: 'ctnCost', header: 'ctnHeader' },
    });
  });

  return columns;
}

// Grid 实例
const [Grid, gridApi] = useVbenVxeGrid<any>({
  gridOptions: {
    columns: buildColumns(),
    data: [], // 初始为空数组
    height: 400,
    rowConfig: {
      keyField: '_rowKey',
      isHover: true,
    },
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      custom: false,
      export: false,
      refresh: false,
      search: false,
      zoom: false,
    },
  },
});

// 监听箱型变化，更新列配置
watch(
  addedCtnTypes,
  async () => {
    await nextTick();
    // 获取当前 Grid 中的数据，避免丢失
    const currentData = gridApi.grid?.getTableData()?.fullData || [];
    gridApi.setGridOptions({
      columns: buildColumns(),
      data: currentData, // 保留当前数据
    });
  },
  { deep: true },
);

// 验证表单
function validateForm(): boolean {
  // 从 Grid 获取最新数据
  const gridRecords = (gridApi.grid?.getTableData()?.fullData || []) as any[];

  if (gridRecords.length === 0) {
    message.warning('没有可编辑的数据');
    return false;
  }

  for (let i = 0; i < gridRecords.length; i++) {
    const row = gridRecords[i];
    const rowNum = i + 1;

    if (!row.carrierId) {
      message.warning(`第 ${rowNum} 行：请选择船公司`);
      return false;
    }
    if (!row.polId) {
      message.warning(`第 ${rowNum} 行：请选择起运港`);
      return false;
    }
    if (!row.podId) {
      message.warning(`第 ${rowNum} 行：请选择目的港`);
      return false;
    }
    if (!row.currencyId) {
      message.warning(`第 ${rowNum} 行：请选择币别`);
      return false;
    }
    if (!row.validTimeStart) {
      message.warning(`第 ${rowNum} 行：请选择有效起始日期`);
      return false;
    }
    if (!row.validTimeEnd) {
      message.warning(`第 ${rowNum} 行：请选择有效截止日期`);
      return false;
    }
  }

  return true;
}

// 检查箱型是否有修改
function hasCtnModified(currentRow: any, originalRow: any): boolean {
  if (!originalRow) return true;

  // 检查箱型数量是否变化
  if (
    currentRow.seFreiPriceCtns.length !==
    (originalRow.seFreiPriceCtns || []).length
  ) {
    return true;
  }

  // 检查每个箱型的 cost 是否变化
  for (let i = 0; i < currentRow.seFreiPriceCtns.length; i++) {
    const currentCtn = currentRow.seFreiPriceCtns[i];
    const originalCtn = originalRow.seFreiPriceCtns?.[i];

    if (!originalCtn || currentCtn.cost !== originalCtn.cost) {
      return true;
    }
  }

  return false;
}

// 提交表单
async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  try {
    // 从 Grid 获取最新数据
    const gridRecords = (gridApi.grid?.getTableData()?.fullData || []) as any[];

    console.log('Grid 中的数据:', gridRecords);

    // 提取所有 ID
    const ids = gridRecords.map((row: any) => row.id).filter(Boolean);

    if (ids.length === 0) {
      message.warning('没有有效的运价记录');
      return;
    }

    // 逐条处理每一行的修改
    const promises = gridRecords.map(async (row, index) => {
      const originalRow = originalData.value[index];
      if (!originalRow) return;

      // 比较当前行与原始数据，找出被修改的字段
      const modifiedFields = new Set<string>();

      // 检查每个字段是否被修改
      if (row.recommend !== originalRow.recommend)
        modifiedFields.add('recommend');
      if (row.carrierId !== originalRow.carrierId)
        modifiedFields.add('carrierId');
      if (row.polId !== originalRow.polId) modifiedFields.add('polId');
      if (row.podId !== originalRow.podId) modifiedFields.add('podId');
      if (row.isDirect !== originalRow.isDirect) modifiedFields.add('isDirect');
      if (row.poT1Id !== originalRow.poT1Id) modifiedFields.add('poT1Id');
      if (row.poT2Id !== originalRow.poT2Id) modifiedFields.add('poT2Id');
      if (row.freeDays !== originalRow.freeDays) modifiedFields.add('freeDays');
      if (row.voyage !== originalRow.voyage) modifiedFields.add('voyage');
      if (row.etd !== originalRow.etd) modifiedFields.add('etd');
      if (row.closeDocTime !== originalRow.closeDocTime)
        modifiedFields.add('closeDocTime');
      if (row.closingTime !== originalRow.closingTime)
        modifiedFields.add('closingTime');
      if (row.validTimeStart !== originalRow.validTimeStart)
        modifiedFields.add('validTimeStart');
      if (row.validTimeEnd !== originalRow.validTimeEnd)
        modifiedFields.add('validTimeEnd');
      if (row.remark !== originalRow.remark) modifiedFields.add('remark');
      if (row.currencyId !== originalRow.currencyId)
        modifiedFields.add('currencyId');

      // 如果没有字段被修改，且箱型也没有修改，跳过这一行
      if (modifiedFields.size === 0 && !hasCtnModified(row, originalRow)) {
        return;
      }

      // 构建单条编辑参数
      const submitData: BatchEditSeFreiPriceInput = {
        ids: [row.id], // 只包含当前行的 ID
      };

      // 添加被修改的字段
      if (modifiedFields.has('recommend')) submitData.recommend = row.recommend;
      if (modifiedFields.has('carrierId')) submitData.carrierId = row.carrierId;
      if (modifiedFields.has('polId')) submitData.polId = row.polId;
      if (modifiedFields.has('podId')) submitData.podId = row.podId;
      if (modifiedFields.has('isDirect')) submitData.isDirect = row.isDirect;
      if (modifiedFields.has('poT1Id')) submitData.poT1Id = row.poT1Id;
      if (modifiedFields.has('poT2Id')) submitData.poT2Id = row.poT2Id;
      if (modifiedFields.has('freeDays')) submitData.freeDays = row.freeDays;
      if (modifiedFields.has('voyage')) submitData.voyage = row.voyage;
      if (modifiedFields.has('etd')) submitData.etd = row.etd;
      if (modifiedFields.has('closeDocTime'))
        submitData.closeDocTime = row.closeDocTime;
      if (modifiedFields.has('closingTime'))
        submitData.closingTime = row.closingTime;
      if (modifiedFields.has('validTimeStart'))
        submitData.validTimeStart = row.validTimeStart;
      if (modifiedFields.has('validTimeEnd'))
        submitData.validTimeEnd = row.validTimeEnd;
      if (modifiedFields.has('remark')) submitData.remark = row.remark;
      if (modifiedFields.has('currencyId'))
        submitData.currencyId = row.currencyId;

      // 处理箱型成本
      if (
        hasCtnModified(row, originalRow) &&
        row.seFreiPriceCtns &&
        row.seFreiPriceCtns.length > 0
      ) {
        submitData.seFreiPriceCtns = row.seFreiPriceCtns.map((ctn: any) => ({
          ctnCodeId: ctn.ctnCodeId,
          cost: ctn.cost,
        }));
      }

      console.log(`第 ${index + 1} 行提交数据:`, submitData);

      // 调用批量编辑 API（虽然叫批量，但可以只传一个 ID）
      await batchEditSeFreiPrice(submitData);
    });

    // 等待所有请求完成
    await Promise.all(promises);

    message.success('批量编辑成功');
    modalApi.close();
    emit('success');
  } catch (error) {
    console.error('批量编辑失败:', error);
    message.error('批量编辑失败');
  } finally {
    loading.value = false;
  }
}

// 重置表单
function resetForm() {
  // 清空 Grid 数据
  gridApi.grid?.loadData([]);
  addedCtnTypes.value = [];
  selectedRowKeys.value = [];
  rowKeyCounter = 0;
  originalData.value = [];
}

onMounted(() => {
  loadSelectOptions();
});
</script>

<template>
  <Modal
    :title="$t('seaExport.freightRate.batchEdit')"
    class="w-[1300px]"
    :confirm-loading="loading"
  >
    <div class="batch-edit-container">
      <!-- 工具栏 -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <span class="text-sm text-gray-600">
            已选择 {{ originalData.length }} 条记录进行批量编辑
          </span>
        </Space>

        <Space>
          <span class="text-gray-600">添加箱型：</span>
          <Select
            style="width: 200px"
            placeholder="选择箱型"
            :options="availableCtnOptions"
            :field-names="{ label: 'ctnName', value: 'ctnCodeId' }"
            @change="handleAddCtnType"
          />
        </Space>
      </div>

      <!-- 提示信息 -->
      <div class="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
        <p><strong>提示：</strong></p>
        <ul class="list-inside list-disc">
          <li>每一行都可以独立修改，系统会分别提交每行的修改</li>
          <li>只有被修改的字段才会提交到后端</li>
          <li>使用"添加箱型"下拉框可以添加新的箱型成本列</li>
          <li>箱型成本列中填写的值会覆盖原有箱型成本</li>
        </ul>
      </div>

      <!-- 表格 -->
      <Grid>
        <!-- 船公司 -->
        <template #carrierId="{ row }">
          <CarrierSelect v-model="row.carrierId" style="width: 100%" />
        </template>

        <!-- 起运港 -->
        <template #polId="{ row }">
          <PortSelect v-model="row.polId" style="width: 100%" />
        </template>

        <!-- 目的港 -->
        <template #podId="{ row }">
          <PortSelect v-model="row.podId" style="width: 100%" />
        </template>

        <!-- 币别 -->
        <template #currencyId="{ row }">
          <CurrencySelect v-model="row.currencyId" style="width: 100%" />
        </template>

        <!-- 是否直达 -->
        <template #isDirect="{ row }">
          <Switch
            v-model:checked="row.isDirect"
            checked-children="是"
            un-checked-children="否"
          />
        </template>

        <!-- 中转港1 -->
        <template #poT1Id="{ row }">
          <PortSelect v-model="row.poT1Id" style="width: 100%" allow-clear />
        </template>

        <!-- 中转港2 -->
        <template #poT2Id="{ row }">
          <PortSelect v-model="row.poT2Id" style="width: 100%" allow-clear />
        </template>

        <!-- 免用箱天数 -->
        <template #freeDays="{ row }">
          <InputNumber
            v-model:value="row.freeDays"
            style="width: 100%"
            :min="0"
            placeholder="请输入"
          />
        </template>

        <!-- 航程 -->
        <template #voyage="{ row }">
          <Input v-model:value="row.voyage" placeholder="请输入" />
        </template>

        <!-- 开船日期 -->
        <template #etd="{ row }">
          <DatePicker
            v-model:value="row.etd"
            style="width: 100%"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </template>

        <!-- 截单时间 -->
        <template #closeDocTime="{ row }">
          <DatePicker
            v-model:value="row.closeDocTime"
            style="width: 100%"
            show-time
            placeholder="选择时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </template>

        <!-- 截港时间 -->
        <template #closingTime="{ row }">
          <DatePicker
            v-model:value="row.closingTime"
            style="width: 100%"
            show-time
            placeholder="选择时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </template>

        <!-- 有效起始日期 -->
        <template #validTimeStart="{ row }">
          <DatePicker
            v-model:value="row.validTimeStart"
            style="width: 100%"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </template>

        <!-- 有效截止日期 -->
        <template #validTimeEnd="{ row }">
          <DatePicker
            v-model:value="row.validTimeEnd"
            style="width: 100%"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </template>

        <!-- 备注 -->
        <template #remark="{ row }">
          <Input v-model:value="row.remark" placeholder="请输入" />
        </template>

        <!-- 箱型列头 -->
        <template #ctnHeader="{ column }">
          <span>{{ column.title }}</span>
        </template>

        <!-- 箱型成本 -->
        <template #ctnCost="{ row, column }">
          <InputNumber
            :value="getCtnCost(row, column.field.replace('ctn_', ''))"
            @change="
              (val: any) =>
                setCtnCost(
                  row,
                  column.field.replace('ctn_', ''),
                  typeof val === 'number' ? val : undefined,
                )
            "
            style="width: 100%"
            :min="0"
            :precision="2"
            placeholder="0.00"
          />
        </template>
      </Grid>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.batch-edit-container {
  :deep(.vxe-table) {
    .vxe-body--column {
      padding: 4px;
    }

    input,
    .ant-select,
    .ant-input-number {
      width: 100%;
    }
  }
}
</style>
