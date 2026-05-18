<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  AddSeFreiPriceInput,
  SeFreiPriceCtnEditDto,
} from '#/api/sea-export/freight-rate-admin';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus, Copy, IconifyIcon } from '@vben/icons';

import {
  Button,
  message,
  Select,
  Space,
  InputNumber,
  Input,
  DatePicker,
  Radio,
  Switch,
  TimePicker,
  Tooltip,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import { getCtnCodePagedList as getBaseCtnCodes } from '#/api/system/base-data/ctn-code-admin';
import { batchAddSimpleSeFreiPrice } from '#/api/sea-export/freight-rate-admin';
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

// 当前选中的箱型ID（用于Select组件）
const selectedCtnId = ref<number | undefined>(undefined);

// 表格数据 - 由 Grid 直接管理
let rowKeyCounter = 0;

// 选中的行 keys
const selectedRowKeys = ref<(string | number)[]>([]);

// 加载状态
const loading = ref(false);

// [Modal, modalApi] 由父组件通过 connectedComponent 注入
const [Modal, modalApi] = useVbenModal({
  async onOpened() {
    console.log('弹窗已打开');

    // 确保默认箱型已加载
    if (allCtnOptions.value.length === 0) {
      await loadSelectOptions();
      console.log(
        '默认箱型加载完成，当前箱型数量:',
        addedCtnTypes.value.length,
      );

      // 等待 watch 触发并完成列配置更新
      await nextTick();
      await nextTick(); // 多等待一个 tick 确保列配置完全应用
    }

    // 弹窗打开时，如果表格为空则添加一行
    const currentData = gridApi.grid?.getFullData() || [];
    console.log('准备添加行，当前数据行数:', currentData.length);
    if (currentData.length === 0) {
      handleAddRow();
      console.log('已添加第一行');
    }
  },
  onCancel() {
    modalApi.close();
  },
  onConfirm() {
    handleSubmit();
  },
});

// 初始化下拉选项
async function loadSelectOptions() {
  try {
    const ctns = await getBaseCtnCodes({
      PageIndex: 1,
      PageSize: 1000,
      Sorting: 'OrderNo',
    });
    allCtnOptions.value =
      ctns?.items?.map((item) => ({
        ctnCodeId: item.id,
        ctnName: item.ctnName || '',
      })) || [];

    // 自动添加默认箱型（status为0且isDefault为true）
    const defaultCtns = ctns?.items?.filter(
      (item) => item.status === 0 && item.isDefault === true,
    );

    if (defaultCtns && defaultCtns.length > 0) {
      addedCtnTypes.value = defaultCtns.map((item) => ({
        ctnCodeId: item.id,
        ctnName: item.ctnName || '',
      }));
      console.log('已加载默认箱型:', addedCtnTypes.value);
    }
  } catch (error) {
    console.error('加载箱型选项失败:', error);
    message.error('加载箱型选项失败');
  }
}

// 生成唯一行 key
function generateRowKey() {
  return `freight_${Date.now()}_${++rowKeyCounter}`;
}

// 创建默认行数据
function createDefaultRow() {
  return {
    _rowKey: generateRowKey(),
    recommend: false,
    carrierId: undefined,
    polId: undefined,
    podId: undefined,
    isDirect: true,
    poT1Id: undefined,
    poT2Id: undefined,
    polFreeDays: undefined,
    podFreeDays: undefined,
    poddem: undefined,
    poddet: undefined,
    voyage: '',
    etd: '',
    etdDayOfWeek: undefined,
    etdDayTime: '',
    closeDocTime: '',
    closeDocDayOfWeek: undefined,
    closeDocDayTime: '',
    closingTime: '',
    closingDayOfWeek: undefined,
    closingDayTime: '',
    validTimeStart: '',
    validTimeEnd: '',
    remark: '',
    currencyId: undefined,
    seFreiPriceCtns: [] as Array<{ ctnCodeId: number; cost?: number }>,
  };
}

// 新增行
function handleAddRow() {
  const newRow = createDefaultRow();

  // 如果已经有添加的箱型，为新行初始化这些箱型的空数据
  if (addedCtnTypes.value.length > 0) {
    newRow.seFreiPriceCtns = addedCtnTypes.value.map((ctn) => ({
      ctnCodeId: ctn.ctnCodeId,
      cost: undefined,
    }));
  }

  // 直接插入到 Grid 中
  gridApi.grid?.insertAt(newRow, -1); // -1 表示插入到末尾
}

// 删除选中行
function handleDeleteRows() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的行');
    return;
  }

  const records = gridApi.grid?.getCheckboxRecords?.() || [];
  records.forEach((row: any) => {
    gridApi.grid?.remove(row);
  });

  selectedRowKeys.value = [];
  message.success('删除成功');
}

// 复制选中行
function handleCopyRows() {
  const records = gridApi.grid?.getCheckboxRecords?.() || [];

  if (records.length === 0) {
    message.warning('请先选择要复制的行');
    return;
  }

  // 复制每一行并插入到表格末尾
  records.forEach((row: any) => {
    // 深拷贝行数据，避免引用问题
    const newRow = JSON.parse(
      JSON.stringify({
        _rowKey: generateRowKey(),
        recommend: row.recommend,
        carrierId: row.carrierId,
        polId: row.polId,
        podId: row.podId,
        isDirect: row.isDirect,
        poT1Id: row.poT1Id,
        poT2Id: row.poT2Id,
        polFreeDays: row.polFreeDays,
        podFreeDays: row.podFreeDays,
        poddem: row.poddem,
        poddet: row.poddet,
        voyage: row.voyage,
        etd: row.etd,
        etdDayOfWeek: row.etdDayOfWeek,
        etdDayTime: row.etdDayTime,
        closeDocTime: row.closeDocTime,
        closeDocDayOfWeek: row.closeDocDayOfWeek,
        closeDocDayTime: row.closeDocDayTime,
        closingTime: row.closingTime,
        closingDayOfWeek: row.closingDayOfWeek,
        closingDayTime: row.closingDayTime,
        validTimeStart: row.validTimeStart,
        validTimeEnd: row.validTimeEnd,
        remark: row.remark,
        currencyId: row.currencyId,
        seFreiPriceCtns: row.seFreiPriceCtns ? [...row.seFreiPriceCtns] : [],
      }),
    );

    // 插入到 Grid 中
    gridApi.grid?.insertAt(newRow, -1);
  });

  message.success(`已复制 ${records.length} 行`);
}

// 处理是否直达字段变化
function handleIsDirectChange(row: any, value: boolean) {
  // 如果设置为直达（true），则清空中转港的值
  if (value) {
    row.poT1Id = undefined;
    row.poT2Id = undefined;
  }
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
  const records = gridApi.grid?.getFullData() || [];
  records.forEach((row: any) => {
    row.seFreiPriceCtns.push({
      ctnCodeId: ctn.ctnCodeId,
      cost: undefined, // 初始值为 undefined，由用户输入
    });
  });

  // 清空选中的箱型ID，方便下次选择
  selectedCtnId.value = undefined;

  message.success('添加箱型成功');
}

// 获取可用的箱型选项（排除已添加的）
const availableCtnOptions = computed(() => {
  const addedIds = new Set(addedCtnTypes.value.map((c) => String(c.ctnCodeId)));
  return allCtnOptions.value.filter((c) => !addedIds.has(String(c.ctnCodeId)));
});

// 箱型选项模糊搜索过滤函数
function filterCtnOption(input: string, option: any) {
  if (!input) return true;
  const ctnName = option?.ctnName || '';
  return ctnName.toLowerCase().includes(input.toLowerCase());
}

// 更新某行的箱型成本
function updateCtnCost(row: any, ctnCodeId: any, cost: number | undefined) {
  if (!row) return;

  // 使用字符串比较查找箱型数据，避免大数精度丢失
  let ctnData = row.seFreiPriceCtns.find(
    (c: any) => String(c.ctnCodeId) === String(ctnCodeId),
  );
  if (!ctnData) {
    ctnData = { ctnCodeId, cost };
    row.seFreiPriceCtns.push(ctnData);
  } else {
    ctnData.cost = cost;
  }
}

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
  console.log('设置箱型成本:', { row, ctnCodeId, cost });
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
      type: 'checkbox',
      width: 60,
    },
    {
      field: 'carrierId',
      title: '船公司',
      width: 150,

      slots: { default: 'carrierId' },
    },
    {
      field: 'polId',
      title: '起运港',
      width: 240,

      slots: { default: 'polId' },
    },
    {
      field: 'podId',
      title: '目的港',
      width: 240,

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
      field: 'polFreeDays',
      title: '起运港免用箱',
      width: 110,
      slots: { default: 'polFreeDays' },
    },
    {
      field: 'podFreeDaysCombined',
      title: '目的港免箱使天数',
      width: 320,
      slots: {
        default: 'podFreeDaysCombined',
        header: 'podFreeDaysCombinedHeader',
      },
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
      width: 230,
      slots: { default: 'etdCombined' },
    },
    {
      field: 'closeDocTime',
      title: '截单时间',
      width: 280,
      slots: { default: 'closeDocTimeCombined' },
    },
    {
      field: 'closingTime',
      title: '截关时间',
      width: 280,
      slots: { default: 'closingTimeCombined' },
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
    checkboxConfig: {
      highlight: true,
      reserve: true,
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
  gridEvents: {
    checkboxChange: ({ checked }: any) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any[];
      selectedRowKeys.value = records.map((r: any) => r._rowKey);
    },
    checkboxAll: ({ checked }: any) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any[];
      selectedRowKeys.value = records.map((r: any) => r._rowKey);
    },
  },
});

// 监听箱型变化，更新列配置
watch(
  addedCtnTypes,
  async (newVal) => {
    console.log('箱型列表变化:', newVal);
    await nextTick();
    // 获取当前 Grid 中的数据，避免丢失
    const currentData = gridApi.grid?.getFullData() || [];
    console.log('更新列配置，当前数据行数:', currentData.length);
    gridApi.setGridOptions({
      columns: buildColumns(),
      data: currentData, // 保留当前数据
    });
    console.log('列配置已更新');
  },
  { deep: true },
);

// 验证表单
function validateForm(): boolean {
  // 从 Grid 获取最新数据
  const gridRecords = (gridApi.grid?.getFullData() || []) as any[];

  if (gridRecords.length === 0) {
    message.warning('请至少添加一行数据');
    return false;
  }

  for (let i = 0; i < gridRecords.length; i++) {
    const row = gridRecords[i];
    const rowNum = i + 1;

    console.log(`第 ${rowNum} 行数据:`, row);

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

// 提交表单
async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  try {
    // 从 Grid 获取最新数据
    const gridRecords = (gridApi.grid?.getFullData() || []) as any[];

    console.log('Grid 中的数据:', gridRecords);

    // 转换数据格式
    const submitData: AddSeFreiPriceInput[] = gridRecords.map((row) => {
      // 构建箱型报价列表 - 只包含已录入运费的箱型
      const seFreiPriceCtns: SeFreiPriceCtnEditDto[] = row.seFreiPriceCtns
        .filter((ctn: any) => ctn.cost !== undefined && ctn.cost !== null)
        .map((ctn: any) => ({
          ctnCodeId: ctn.ctnCodeId,
          cost: ctn.cost,
        }));

      return {
        recommend: row.recommend || false,
        carrierId: row.carrierId,
        polId: row.polId,
        podId: row.podId,
        isDirect: row.isDirect,
        poT1Id: row.poT1Id,
        poT2Id: row.poT2Id,
        polFreeDays: row.polFreeDays,
        podFreeDays: row.podFreeDays,
        poddem: row.poddem,
        poddet: row.poddet,
        voyage: row.voyage,
        etd: row.etd,
        etdDayOfWeek: row.etdDayOfWeek,
        etdDayTime: row.etdDayTime,
        closeDocTime: row.closeDocTime,
        closeDocDayOfWeek: row.closeDocDayOfWeek,
        closeDocDayTime: row.closeDocDayTime,
        closingTime: row.closingTime,
        closingDayOfWeek: row.closingDayOfWeek,
        closingDayTime: row.closingDayTime,
        validTimeStart: row.validTimeStart,
        validTimeEnd: row.validTimeEnd,
        remark: row.remark,
        currencyId: row.currencyId,
        seFreiPriceCtns,
        seFreiPriceFees: [], // 批量新增不包含附加费
      };
    });

    console.log('提交数据:', submitData);

    // TODO: 调用批量新增 API
    await batchAddSimpleSeFreiPrice(submitData);

    message.success('批量新增成功');
    modalApi.close();
    emit('success');
  } catch (error) {
    console.error('批量新增失败:', error);
    message.error('批量新增失败');
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
}
</script>

<template>
  <Modal
    :title="$t('seaExport.freightRate.batchAdd')"
    class="w-[1300px]"
    :confirm-loading="loading"
  >
    <div class="batch-add-container">
      <!-- 工具栏 -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <Button type="primary" @click="handleAddRow">
            <Plus class="size-4" />
            新增行
          </Button>
          <Button
            :disabled="selectedRowKeys.length === 0"
            @click="handleCopyRows"
          >
            <Copy class="size-4" />
            复制选中行
          </Button>
          <Button
            danger
            :disabled="selectedRowKeys.length === 0"
            @click="handleDeleteRows"
          >
            删除选中行
          </Button>
        </Space>

        <Space>
          <span class="text-gray-600">添加箱型：</span>
          <Select
            v-model:value="selectedCtnId"
            style="width: 200px"
            placeholder="选择箱型"
            show-search
            :filter-option="filterCtnOption"
            :options="availableCtnOptions"
            :field-names="{ label: 'ctnName', value: 'ctnCodeId' }"
            @change="handleAddCtnType"
          />
        </Space>
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
            @change="(val: any) => handleIsDirectChange(row, val)"
          />
        </template>

        <!-- 中转港1 -->
        <template #poT1Id="{ row }">
          <PortSelect
            v-model="row.poT1Id"
            style="width: 100%"
            allow-clear
            :disabled="row.isDirect"
          />
        </template>

        <!-- 中转港2 -->
        <template #poT2Id="{ row }">
          <PortSelect
            v-model="row.poT2Id"
            style="width: 100%"
            allow-clear
            :disabled="row.isDirect"
          />
        </template>

        <!-- 起运港免用箱天数 -->
        <template #polFreeDays="{ row }">
          <InputNumber
            v-model:value="row.polFreeDays"
            style="width: 100%"
            :min="0"
            placeholder="请输入"
          />
        </template>

        <!-- 目的港免箱使天数合并编辑 -->
        <template #podFreeDaysCombined="{ row }">
          <div class="flex items-center justify-center gap-2 p-1">
            <!-- 免堆期 (DEM) -->
            <InputNumber
              v-model:value="row.poddem"
              style="width: 60px"
              :min="0"
              placeholder="DEM"
            />

            <span class="text-sm text-gray-400">+</span>

            <!-- 免用箱期 (DET) -->
            <InputNumber
              v-model:value="row.podFreeDays"
              style="width: 60px"
              :min="0"
              placeholder="DET"
            />

            <span class="text-sm text-gray-400">=</span>

            <!-- 免箱使期（自动计算或手动输入） -->
            <InputNumber
              v-model:value="row.poddet"
              style="width: 60px"
              :min="0"
              placeholder="-"
              class="font-medium"
            />
          </div>
        </template>

        <!-- 目的港免箱使天数列头 -->
        <template #podFreeDaysCombinedHeader>
          <div class="flex items-center gap-1">
            <span>目的港免箱使天数</span>
            <Tooltip title="免堆期 (DEM) + 免用箱期 (DET) = 免箱使期">
              <IconifyIcon
                icon="mdi:information-outline"
                class="size-4 cursor-help text-gray-500"
              />
            </Tooltip>
          </div>
        </template>

        <!-- 航程 -->
        <template #voyage="{ row }">
          <Input v-model:value="row.voyage" placeholder="请输入" />
        </template>

        <!-- 合并的开船日期与星期 -->
        <template #etdCombined="{ row }">
          <div class="flex w-full items-center gap-2">
            <DatePicker
              v-model:value="row.etd"
              style="width: 140px"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              :disabled="!!row.etdDayOfWeek"
              allow-clear
            />
            <span class="shrink-0 text-xs text-gray-400">或</span>
            <Select
              v-model:value="row.etdDayOfWeek"
              style="width: 90px"
              placeholder="星期"
              :disabled="!!row.etd"
              allow-clear
            >
              <Select.Option :value="0">周日</Select.Option>
              <Select.Option :value="1">周一</Select.Option>
              <Select.Option :value="2">周二</Select.Option>
              <Select.Option :value="3">周三</Select.Option>
              <Select.Option :value="4">周四</Select.Option>
              <Select.Option :value="5">周五</Select.Option>
              <Select.Option :value="6">周六</Select.Option>
            </Select>
          </div>
        </template>

        <!-- 合并的截单时间与星期 -->
        <template #closeDocTimeCombined="{ row }">
          <div class="flex w-full items-center gap-2">
            <!-- 完整日期时间选择器 -->
            <DatePicker
              v-model:value="row.closeDocTime"
              style="width: 180px"
              show-time
              placeholder="选择时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              :disabled="!!row.closeDocDayOfWeek"
              allow-clear
            />
            <span class="shrink-0 text-xs text-gray-400">或</span>
            <!-- 星期 + 时间选择器组合 -->
            <div class="flex flex-1 items-center gap-1">
              <Select
                v-model:value="row.closeDocDayOfWeek"
                style="width: 70px"
                placeholder="星期"
                :disabled="!!row.closeDocTime"
                allow-clear
              >
                <Select.Option :value="0">周日</Select.Option>
                <Select.Option :value="1">周一</Select.Option>
                <Select.Option :value="2">周二</Select.Option>
                <Select.Option :value="3">周三</Select.Option>
                <Select.Option :value="4">周四</Select.Option>
                <Select.Option :value="5">周五</Select.Option>
                <Select.Option :value="6">周六</Select.Option>
              </Select>
              <TimePicker
                v-model:value="row.closeDocDayTime"
                style="width: 90px"
                placeholder="时间"
                format="HH:mm"
                value-format="HH:mm"
                :disabled="
                  !row.closeDocDayOfWeek && row.closeDocDayOfWeek !== 0
                "
                allow-clear
              />
            </div>
          </div>
        </template>

        <!-- 合并的截关时间与星期 -->
        <template #closingTimeCombined="{ row }">
          <div class="flex w-full items-center gap-2">
            <!-- 完整日期时间选择器 -->
            <DatePicker
              v-model:value="row.closingTime"
              style="width: 180px"
              show-time
              placeholder="选择时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              :disabled="!!row.closingDayOfWeek"
              allow-clear
            />
            <span class="shrink-0 text-xs text-gray-400">或</span>
            <!-- 星期 + 时间选择器组合 -->
            <div class="flex flex-1 items-center gap-1">
              <Select
                v-model:value="row.closingDayOfWeek"
                style="width: 70px"
                placeholder="星期"
                :disabled="!!row.closingTime"
                allow-clear
              >
                <Select.Option :value="0">周日</Select.Option>
                <Select.Option :value="1">周一</Select.Option>
                <Select.Option :value="2">周二</Select.Option>
                <Select.Option :value="3">周三</Select.Option>
                <Select.Option :value="4">周四</Select.Option>
                <Select.Option :value="5">周五</Select.Option>
                <Select.Option :value="6">周六</Select.Option>
              </Select>
              <TimePicker
                v-model:value="row.closingDayTime"
                style="width: 90px"
                placeholder="时间"
                format="HH:mm"
                value-format="HH:mm"
                :disabled="!row.closingDayOfWeek && row.closingDayOfWeek !== 0"
                allow-clear
              />
            </div>
          </div>
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

      <!-- 提示信息 -->
      <div class="mt-4 text-sm text-gray-500">
        <p>提示：</p>
        <ul class="list-inside list-disc">
          <li>点击"新增行"按钮添加新的运价记录</li>
          <li>选中行后点击"复制选中行"可快速复制该行数据</li>
          <li>勾选行后点击"删除选中行"可删除选中的记录</li>
          <li>使用"添加箱型"下拉框动态添加箱型成本列</li>
          <li>带 * 号的字段为必填项</li>
        </ul>
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.batch-add-container {
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
