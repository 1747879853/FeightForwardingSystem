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

// 时间模式控制（用于独立日期模块）
const dateEditMode = ref<'date' | 'week'>('date'); // 默认日期模式

// 开船日子表输入模式控制（用于互斥）
const etdInputMode = ref<'date' | 'weekday' | null>(null);

// 开船日子表（日期模式）- 一组包含三个日期
const etdList = ref<
  Array<{
    id?: string;
    etd?: string; // 开船日期
    closeDocTime?: string; // 截单时间（日期格式）
    closingTime?: string; // 截关时间（日期格式）
  }>
>([]);

// 开船日周几子表（星期模式）- 一组包含三个星期+时间点
const etdDayList = ref<
  Array<{
    id?: string;
    etdDayOfWeek?: number; // 开船星期
    etdDayTime?: string; // 开船时间点
    closeDocDayOfWeek?: number; // 截单星期
    closeDocDayTime?: string; // 截单时间点
    closingDayOfWeek?: number; // 截关星期
    closingDayTime?: string; // 截关时间点
  }>
>([]);

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
  closeOnClickModal: false,
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

// ==================== 日期时间管理 ====================

/**
 * 切换到日期模式
 */
function switchToDateMode() {
  if (dateEditMode.value === 'week') {
    // 清空星期模式数据
    etdDayList.value = [];
  }
  dateEditMode.value = 'date';
}

/**
 * 切换到星期模式
 */
function switchToWeekMode() {
  if (dateEditMode.value === 'date') {
    // 清空日期模式数据
    etdList.value = [];
  }
  dateEditMode.value = 'week';
}

/**
 * 添加一组日期/星期数据
 */
function addDateGroup() {
  if (dateEditMode.value === 'date') {
    etdList.value.push({
      etd: undefined,
      closeDocTime: undefined,
      closingTime: undefined,
    });
  } else {
    etdDayList.value.push({
      etdDayOfWeek: undefined,
      etdDayTime: undefined,
      closeDocDayOfWeek: undefined,
      closeDocDayTime: undefined,
      closingDayOfWeek: undefined,
      closingDayTime: undefined,
    });
  }
}

/**
 * 删除一组日期数据
 */
function removeDateGroup(index: number) {
  etdList.value.splice(index, 1);
}

/**
 * 删除一组星期数据
 */
function removeWeekGroup(index: number) {
  etdDayList.value.splice(index, 1);
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
    contractNo: '',
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
      width: 260,

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
      width: 200,
      slots: { default: 'poT1Id' },
    },
    {
      field: 'poT2Id',
      title: '中转港2',
      width: 200,
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
      field: 'contractNo',
      title: '约号',
      width: 280,
      slots: { default: 'contractNo' },
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
      width: 400,
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

    // 构建关联日列表（seFreiPriceDays）- 日期模式
    const seFreiPriceDays =
      dateEditMode.value === 'date'
        ? etdList.value
            .filter((day) => day.etd || day.closeDocTime || day.closingTime)
            .map((day) => ({
              ...(day.id ? { id: day.id } : {}),
              etd: day.etd,
              closeDocTime: day.closeDocTime,
              closingTime: day.closingTime,
            }))
        : [];

    // 构建关联周几列表（seFreiPriceWeekDays）- 星期模式
    const seFreiPriceWeekDays =
      dateEditMode.value === 'week'
        ? etdDayList.value
            .filter(
              (weekDay) =>
                weekDay.etdDayOfWeek !== undefined ||
                weekDay.closeDocDayOfWeek !== undefined ||
                weekDay.closingDayOfWeek !== undefined,
            )
            .map((weekDay) => ({
              ...(weekDay.id ? { id: weekDay.id } : {}),
              etdDayOfWeek: weekDay.etdDayOfWeek,
              etdDayTime: weekDay.etdDayTime,
              closeDocDayOfWeek: weekDay.closeDocDayOfWeek,
              closeDocDayTime: weekDay.closeDocDayTime,
              closingDayOfWeek: weekDay.closingDayOfWeek,
              closingDayTime: weekDay.closingDayTime,
            }))
        : [];

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
        contractNo: row.contractNo,
        validTimeStart: row.validTimeStart,
        validTimeEnd: row.validTimeEnd,
        remark: row.remark,
        currencyId: row.currencyId,
        seFreiPriceCtns,
        seFreiPriceFees: [], // 批量新增不包含附加费
        seFreiPriceDays,
        seFreiPriceWeekDays,
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

        <!-- 约号 -->
        <template #contractNo="{ row }">
          <Input
            v-model:value="row.contractNo"
            placeholder="请输入约号"
            :maxlength="128"
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

      <!-- 日期时间设置模块 -->
      <div class="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3
          class="mb-4 flex items-center justify-between text-base font-semibold text-gray-800"
        >
          <span>日期时间设置</span>
          <div class="flex items-center gap-2">
            <!-- 模式切换按钮 -->
            <Button
              :type="dateEditMode === 'date' ? 'primary' : 'default'"
              size="small"
              @click="switchToDateMode"
              :class="{
                'mode-btn-active': dateEditMode === 'date',
                'mode-btn-inactive': dateEditMode !== 'date',
              }"
            >
              <IconifyIcon icon="mdi:calendar-range" class="mr-1 size-4" />
              日期模式
            </Button>
            <Button
              :type="dateEditMode === 'week' ? 'primary' : 'default'"
              size="small"
              @click="switchToWeekMode"
              :class="{
                'mode-btn-active': dateEditMode === 'week',
                'mode-btn-inactive': dateEditMode !== 'week',
              }"
            >
              <IconifyIcon icon="mdi:calendar-weekend" class="mr-1 size-4" />
              星期模式
            </Button>
            <!-- 添加按钮 -->
            <Button type="link" size="small" @click="addDateGroup">
              <IconifyIcon icon="mdi:plus" class="size-4" />
              添加一组
            </Button>
          </div>
        </h3>

        <!-- 日期模式 -->
        <div v-if="dateEditMode === 'date'">
          <div v-if="etdList.length === 0" class="empty-tip">
            暂无日期数据，请点击"添加一组"按钮添加
          </div>
          <div v-else class="sub-table">
            <div
              v-for="(dateGroup, index) in etdList"
              :key="index"
              class="sub-table-row date-group-row"
            >
              <div class="date-group-content">
                <!-- 开船日期 -->
                <div class="date-field">
                  <label class="field-label">
                    <IconifyIcon icon="mdi:ship-wheel" class="mr-1 size-4" />
                    开船日期
                  </label>
                  <DatePicker
                    v-model:value="dateGroup.etd"
                    placeholder="请选择开船日期"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm"
                    show-time
                    :time-picker-props="{ format: 'HH:mm' }"
                    style="width: 100%"
                  />
                </div>
                <!-- 截单时间 -->
                <div class="date-field">
                  <label class="field-label">
                    <IconifyIcon
                      icon="mdi:file-document-check"
                      class="mr-1 size-4"
                    />
                    截单时间
                  </label>
                  <DatePicker
                    v-model:value="dateGroup.closeDocTime"
                    placeholder="请选择截单时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm"
                    show-time
                    :time-picker-props="{ format: 'HH:mm' }"
                    style="width: 100%"
                  />
                </div>
                <!-- 截关时间 -->
                <div class="date-field">
                  <label class="field-label">
                    <IconifyIcon
                      icon="mdi:container-lock"
                      class="mr-1 size-4"
                    />
                    截关时间
                  </label>
                  <DatePicker
                    v-model:value="dateGroup.closingTime"
                    placeholder="请选择截关时间"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm"
                    show-time
                    :time-picker-props="{ format: 'HH:mm' }"
                    style="width: 100%"
                  />
                </div>
              </div>
              <Button
                type="link"
                danger
                size="small"
                @click="removeDateGroup(index)"
                class="delete-btn"
              >
                <IconifyIcon icon="mdi:delete-outline" class="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <!-- 星期模式 -->
        <div v-if="dateEditMode === 'week'">
          <div v-if="etdDayList.length === 0" class="empty-tip">
            暂无星期数据，请点击"添加一组"按钮添加
          </div>
          <div v-else class="sub-table">
            <div
              v-for="(weekGroup, index) in etdDayList"
              :key="index"
              class="sub-table-row week-group-row"
            >
              <div class="week-group-content">
                <!-- 开船星期组 -->
                <div class="week-pair">
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon icon="mdi:ship-wheel" class="mr-1 size-4" />
                      开船星期
                    </label>
                    <Select
                      v-model:value="weekGroup.etdDayOfWeek"
                      placeholder="请选择"
                      style="width: 100%"
                      :options="[
                        { label: '周日', value: 0 },
                        { label: '周一', value: 1 },
                        { label: '周二', value: 2 },
                        { label: '周三', value: 3 },
                        { label: '周四', value: 4 },
                        { label: '周五', value: 5 },
                        { label: '周六', value: 6 },
                      ]"
                    />
                  </div>
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:clock-outline"
                        class="mr-1 size-4"
                      />
                      时间点
                    </label>
                    <TimePicker
                      v-model:value="weekGroup.etdDayTime"
                      placeholder="请选择"
                      format="HH:mm"
                      value-format="HH:mm:ss"
                      style="width: 100%"
                    />
                  </div>
                </div>

                <!-- 截单星期组 -->
                <div class="week-pair">
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:file-document-check"
                        class="mr-1 size-4"
                      />
                      截单星期
                    </label>
                    <Select
                      v-model:value="weekGroup.closeDocDayOfWeek"
                      placeholder="请选择"
                      style="width: 100%"
                      :options="[
                        { label: '周日', value: 0 },
                        { label: '周一', value: 1 },
                        { label: '周二', value: 2 },
                        { label: '周三', value: 3 },
                        { label: '周四', value: 4 },
                        { label: '周五', value: 5 },
                        { label: '周六', value: 6 },
                      ]"
                    />
                  </div>
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:clock-outline"
                        class="mr-1 size-4"
                      />
                      时间点
                    </label>
                    <TimePicker
                      v-model:value="weekGroup.closeDocDayTime"
                      placeholder="请选择"
                      format="HH:mm"
                      value-format="HH:mm:ss"
                      style="width: 100%"
                    />
                  </div>
                </div>

                <!-- 截关星期组 -->
                <div class="week-pair">
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:container-lock"
                        class="mr-1 size-4"
                      />
                      截关星期
                    </label>
                    <Select
                      v-model:value="weekGroup.closingDayOfWeek"
                      placeholder="请选择"
                      style="width: 100%"
                      :options="[
                        { label: '周日', value: 0 },
                        { label: '周一', value: 1 },
                        { label: '周二', value: 2 },
                        { label: '周三', value: 3 },
                        { label: '周四', value: 4 },
                        { label: '周五', value: 5 },
                        { label: '周六', value: 6 },
                      ]"
                    />
                  </div>
                  <div class="week-field">
                    <label class="field-label">
                      <IconifyIcon
                        icon="mdi:clock-outline"
                        class="mr-1 size-4"
                      />
                      时间点
                    </label>
                    <TimePicker
                      v-model:value="weekGroup.closingDayTime"
                      placeholder="请选择"
                      format="HH:mm"
                      value-format="HH:mm:ss"
                      style="width: 100%"
                    />
                  </div>
                </div>
              </div>
              <Button
                type="link"
                danger
                size="small"
                @click="removeWeekGroup(index)"
                class="delete-btn"
              >
                <IconifyIcon icon="mdi:delete-outline" class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

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
@media (max-width: 1200px) {
  .date-group-content {
    grid-template-columns: 1fr;
  }

  .week-group-content {
    grid-template-columns: 1fr;
  }
}

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

/* 模式切换按钮样式增强 */
.mode-btn-active {
  font-weight: 600 !important;
  color: white !important;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important;
  border-color: #2563eb !important;
  box-shadow: 0 4px 12px rgb(59 130 246 / 50%) !important;
  transform: scale(1.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-btn-active:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
  box-shadow: 0 6px 16px rgb(59 130 246 / 60%) !important;
  transform: scale(1.1);
}

.mode-btn-active:active {
  transform: scale(1.05);
}

.mode-btn-inactive {
  color: #9ca3af !important;
  background-color: #fafafa !important;
  border-color: #e5e7eb !important;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.mode-btn-inactive:hover {
  color: #6b7280 !important;
  background-color: #f3f4f6 !important;
  border-color: #d1d5db !important;
  opacity: 0.85;
}

.empty-tip {
  padding: 32px 16px;
  font-size: 14px;
  color: #94a3b8;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.empty-tip:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #94a3b8;
}

.sub-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-table-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.date-group-row,
.week-group-row {
  position: relative;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.date-group-row::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  content: '';
  background: linear-gradient(to bottom, #3b82f6, #60a5fa);
  border-radius: 8px 0 0 8px;
}

.date-group-content {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.week-group-content {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.date-field,
.week-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-field .field-label,
.week-field .field-label {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.week-pair {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.week-pair .week-field:first-child {
  flex: 1;
}

.week-pair .week-field:last-child {
  flex: 0 0 100px;
}

.delete-btn {
  flex-shrink: 0;
  margin-top: 24px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.delete-btn:hover {
  opacity: 1;
}
</style>
