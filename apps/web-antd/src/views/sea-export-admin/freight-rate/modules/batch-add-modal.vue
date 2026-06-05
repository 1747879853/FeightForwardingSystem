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
  DropdownButton,
  Menu,
  MenuItem,
  Modal as AntModal,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import CarrierSelect from '#/adapter/component/biz-select/carrier-select.vue';
import PortSelect from '#/adapter/component/biz-select/port-select.vue';
import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import { getCtnCodePagedList as getBaseCtnCodes } from '#/api/system/base-data/ctn-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
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

// USD 币别 ID（默认值）
const defaultCurrencyId = ref<number | undefined>(undefined);

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

    // 加载币别列表，查找 USD 的 ID
    try {
      const currencies = await getCurrencyPagedList({
        PageIndex: 1,
        PageSize: 100,
      });
      const usdCurrency = currencies?.items?.find(
        (item) => item.code?.toUpperCase() === 'USD',
      );
      if (usdCurrency) {
        defaultCurrencyId.value = usdCurrency.id;
        console.log('USD 币别 ID:', defaultCurrencyId.value);
      }
    } catch (error) {
      console.error('加载币别列表失败:', error);
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
function createDefaultRow(isCopied: boolean = false) {
  return {
    _rowKey: generateRowKey(),
    _isCopied: isCopied, // 标识是否为复制的行
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
    // 日期时间模式字段
    etd: '',
    closeDocTime: '',
    closingTime: '',
    // 星期模式字段
    etdDayOfWeek: undefined,
    etdDayTime: '',
    closeDocDayOfWeek: undefined,
    closeDocDayTime: '',
    closingDayOfWeek: undefined,
    closingDayTime: '',
    validTimeStart: '',
    validTimeEnd: '',
    remark: '',
    currencyId: defaultCurrencyId.value, // 默认设置为 USD
    seFreiPriceCtns: [] as Array<{ ctnCodeId: number; cost?: number }>,
  };
}

// 新增行 - 默认新增1行
function handleAddRow() {
  addRows(1);
}

// 新增多行
function addRows(count: number) {
  for (let i = 0; i < count; i++) {
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

  message.success(`已新增 ${count} 行`);
}

// 自定义行数弹窗
const customRowCountVisible = ref(false);
const customRowCount = ref<number>(1);

function showCustomRowCountModal() {
  customRowCount.value = 1;
  customRowCountVisible.value = true;
}

async function handleConfirmCustomRowCount() {
  if (!customRowCount.value || customRowCount.value <= 0) {
    message.warning('请输入有效的行数');
    return;
  }

  if (customRowCount.value > 100) {
    message.warning('单次最多新增100行');
    return;
  }

  customRowCountVisible.value = false;
  addRows(customRowCount.value);
}

// 删除选中行
function handleDeleteRows() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的行');
    return;
  }

  const records = gridApi.grid?.getCheckboxRecords?.() || [];

  AntModal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${records.length} 行数据吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      records.forEach((row: any) => {
        gridApi.grid?.remove(row);
      });

      selectedRowKeys.value = [];
      message.success('删除成功');
    },
  });
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
        _isCopied: true, // 标记为复制的行
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
      type: 'seq',
      title: '序号',
      width: 60,
    },
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
      width: 340,

      slots: { default: 'polId' },
    },
    {
      field: 'podId',
      title: '目的港',
      width: 340,

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
      field: 'dateTimeMode',
      title: '日期时间',
      width: 720,
      slots: { default: 'dateTimeMode' },
    },
    {
      field: 'weekMode',
      title: '星期模式',
      width: 680,
      slots: { default: 'weekMode' },
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
    rowStyle: ({ row }: any) => {
      if (row._isCopied) {
        return {
          backgroundColor: '#fff7e6',
        };
      }
      return {};
    },
    checkboxConfig: {
      highlight: true,
      reserve: true,
    },
    pagerConfig: {
      enabled: false,
    },
    toolbarConfig: {
      custom: true,
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

// 处理日期时间模式切换 - 切换到日期模式时清空星期模式
function handleSwitchToDateTimeMode(row: any) {
  row.etdDayOfWeek = undefined;
  row.etdDayTime = '';
  row.closeDocDayOfWeek = undefined;
  row.closeDocDayTime = '';
  row.closingDayOfWeek = undefined;
  row.closingDayTime = '';
}

// 处理星期模式切换 - 切换到星期模式时清空日期模式
function handleSwitchToWeekMode(row: any) {
  row.etd = '';
  row.closeDocTime = '';
  row.closingTime = '';
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

      // 构建日期时间模式数据（如果填写了任意一个日期字段）
      const seFreiPriceDays =
        row.etd || row.closeDocTime || row.closingTime
          ? [
              {
                etd: row.etd || undefined,
                closeDocTime: row.closeDocTime || undefined,
                closingTime: row.closingTime || undefined,
              },
            ]
          : [];

      // 构建星期模式数据（如果填写了任意一个星期字段）
      const seFreiPriceWeekDays =
        row.etdDayOfWeek !== undefined ||
        row.closeDocDayOfWeek !== undefined ||
        row.closingDayOfWeek !== undefined
          ? [
              {
                etdDayOfWeek: row.etdDayOfWeek,
                etdDayTime: row.etdDayTime || undefined,
                closeDocDayOfWeek: row.closeDocDayOfWeek,
                closeDocDayTime: row.closeDocDayTime || undefined,
                closingDayOfWeek: row.closingDayOfWeek,
                closingDayTime: row.closingDayTime || undefined,
              },
            ]
          : [];

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
          <DropdownButton type="primary" @click="handleAddRow">
            <template #icon>
              <Plus class="size-4" />
            </template>
            新增行
            <template #overlay>
              <Menu>
                <MenuItem @click="addRows(5)"> 新增 5 行 </MenuItem>
                <MenuItem @click="addRows(10)"> 新增 10 行 </MenuItem>
                <MenuItem @click="showCustomRowCountModal">
                  新增自定义行数
                </MenuItem>
              </Menu>
            </template>
          </DropdownButton>
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

        <!-- 日期时间模式（开船日期、截单时间、截关时间） -->
        <template #dateTimeMode="{ row }">
          <div class="flex gap-2">
            <!-- 开船日期 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">开船:</span>
              <DatePicker
                v-model:value="row.etd"
                style="width: 180px"
                placeholder="选择日期和时间"
                value-format="YYYY-MM-DD"
                format="YYYY-MM-DD"
                :disabled="!!row.etdDayOfWeek"
                allow-clear
                @change="handleSwitchToDateTimeMode(row)"
              />
            </div>
            <!-- 截单时间 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截单:</span>
              <DatePicker
                v-model:value="row.closeDocTime"
                style="width: 180px"
                show-time
                :time-picker-props="{ format: 'HH:mm' }"
                placeholder="选择日期和时间"
                value-format="YYYY-MM-DD HH:mm"
                format="YYYY-MM-DD HH:mm"
                :disabled="!!row.closeDocDayOfWeek"
                allow-clear
                @change="handleSwitchToDateTimeMode(row)"
              />
            </div>
            <!-- 截关时间 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截关:</span>
              <DatePicker
                v-model:value="row.closingTime"
                style="width: 180px"
                show-time
                :time-picker-props="{ format: 'HH:mm' }"
                placeholder="选择日期和时间"
                value-format="YYYY-MM-DD HH:mm"
                format="YYYY-MM-DD HH:mm"
                :disabled="!!row.closingDayOfWeek"
                allow-clear
                @change="handleSwitchToDateTimeMode(row)"
              />
            </div>
          </div>
        </template>

        <!-- 星期模式（开船日期、截单时间、截关时间） -->
        <template #weekMode="{ row }">
          <div class="flex gap-2">
            <!-- 开船日期 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">开船:</span>
              <div class="flex flex-1 items-center gap-1">
                <Select
                  v-model:value="row.etdDayOfWeek"
                  style="width: 70px"
                  placeholder="星期"
                  :disabled="!!row.etd"
                  allow-clear
                  @change="handleSwitchToWeekMode(row)"
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
                  v-model:value="row.etdDayTime"
                  style="width: 90px"
                  placeholder="时间"
                  format="HH:mm"
                  value-format="HH:mm"
                  :disabled="!row.etdDayOfWeek && row.etdDayOfWeek !== 0"
                  allow-clear
                />
              </div>
            </div>
            <!-- 截单时间 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截单:</span>
              <div class="flex flex-1 items-center gap-1">
                <Select
                  v-model:value="row.closeDocDayOfWeek"
                  style="width: 70px"
                  placeholder="星期"
                  :disabled="!!row.closeDocTime"
                  allow-clear
                  @change="handleSwitchToWeekMode(row)"
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
            <!-- 截关时间 -->
            <div class="flex items-center gap-2">
              <span class="shrink-0 text-xs text-gray-500">截关:</span>
              <div class="flex flex-1 items-center gap-1">
                <Select
                  v-model:value="row.closingDayOfWeek"
                  style="width: 70px"
                  placeholder="星期"
                  :disabled="!!row.closingTime"
                  allow-clear
                  @change="handleSwitchToWeekMode(row)"
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
                  :disabled="
                    !row.closingDayOfWeek && row.closingDayOfWeek !== 0
                  "
                  allow-clear
                />
              </div>
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

    <!-- 自定义行数弹窗 -->
    <AntModal
      v-model:open="customRowCountVisible"
      title="设置新增行数"
      @ok="handleConfirmCustomRowCount"
    >
      <div class="py-4">
        <label class="mb-2 block text-sm font-medium text-gray-700">
          请输入要新增的行数：
        </label>
        <InputNumber
          v-model:value="customRowCount"
          :min="1"
          :max="100"
          style="width: 100%"
          placeholder="请输入行数（1-100）"
        />
      </div>
    </AntModal>
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
