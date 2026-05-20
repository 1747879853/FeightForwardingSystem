<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type {
  BatchEditSeFreiPriceInput,
  SeFreiPriceCtnEditDto,
  SeFreiPriceOutDto,
} from '#/api/sea-export/freight-rate-admin';
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { PortCodeAdminApi } from '#/api/system/base-data/port-code-admin';
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

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
import { getCarrierDetail } from '#/api/system/base-data/carrier-admin';
import { getPortCodeDetail } from '#/api/system/base-data/port-code-admin';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
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

// 加载状态
const loading = ref(false);

// 原始选中的数据
const originalData = ref<SeFreiPriceOutDto[]>([]);

// 船公司缓存（用于回显）
const carrierCache = ref<Map<number, CarrierAdminApi.CarrierDto>>(new Map());

// 港口缓存（用于回显）
const portCache = ref<Map<number, PortCodeAdminApi.PortCodeDto>>(new Map());

// 币别缓存（用于回显）
const currencyCache = ref<Map<number, CurrencyAdminApi.CurrencyDto>>(new Map());

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

  // 收集所有需要加载的船公司 ID
  const carrierIds = Array.from(
    new Set(rows.map((row) => row.carrierId).filter(Boolean)),
  );

  // 批量加载船公司详情（用于回显）
  if (carrierIds.length > 0) {
    await Promise.all(
      carrierIds.map(async (carrierId) => {
        try {
          const detail = await getCarrierDetail(carrierId);
          carrierCache.value.set(carrierId, detail);
        } catch (error) {
          console.error(`加载船公司 ${carrierId} 详情失败:`, error);
        }
      }),
    );
  }

  // 收集所有需要加载的港口 ID
  const portIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.polId, row.podId, row.poT1Id, row.poT2Id])
        .filter((id): id is number => Boolean(id)),
    ),
  );

  // 批量加载港口详情（用于回显）
  if (portIds.length > 0) {
    await Promise.all(
      portIds.map(async (portId) => {
        try {
          const detail = await getPortCodeDetail(portId);
          portCache.value.set(portId, detail);
        } catch (error) {
          console.error(`加载港口 ${portId} 详情失败:`, error);
        }
      }),
    );
  }

  // 收集所有需要加载的币别 ID
  const currencyIds = Array.from(
    new Set(rows.map((row) => row.currencyId).filter(Boolean)),
  );

  // 批量加载币别详情（用于回显）
  if (currencyIds.length > 0) {
    await Promise.all(
      currencyIds.map(async (currencyId) => {
        try {
          const detail = await getCurrencyDetail(currencyId);
          currencyCache.value.set(currencyId, detail);
        } catch (error) {
          console.error(`加载币别 ${currencyId} 详情失败:`, error);
        }
      }),
    );
  }

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
      polFreeDays: row.polFreeDays,
      podFreeDays: row.podFreeDays,
      poddem: row.poddem,
      poddet: row.poddet,
      voyage: row.voyage,
      contractNo: row.contractNo,
      closeDocTime: row.closeDocTime,
      closeDocDayOfWeek: row.closeDocDayOfWeek,
      closeDocDayTime: row.closeDocDayTime,
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

// 处理是否直达字段变化
function handleIsDirectChange(row: any, value: boolean) {
  // 如果设置为直达（true），则清空中转港的值
  if (value) {
    row.poT1Id = undefined;
    row.poT2Id = undefined;
  }
}

// 箱型选项模糊搜索过滤函数
function filterCtnOption(input: string, option: any) {
  if (!input) return true;
  const ctnName = option?.ctnName || '';
  return ctnName.toLowerCase().includes(input.toLowerCase());
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
    // {
    //   field: 'poddem',
    //   title: '目的港免堆期',
    //   width: 110,
    //   slots: { default: 'poddem' },
    // },
    // {
    //   field: 'poddet',
    //   title: '目的港免箱期',
    //   width: 110,
    //   slots: { default: 'poddet' },
    // },
    {
      field: 'voyage',
      title: '航程',
      width: 120,
      slots: { default: 'voyage' },
    },
    {
      field: 'contractNo',
      title: '约号',
      width: 150,
      slots: { default: 'contractNo' },
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
      width: 280,
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
      if (row.polFreeDays !== originalRow.polFreeDays)
        modifiedFields.add('polFreeDays');
      if (row.podFreeDays !== originalRow.podFreeDays)
        modifiedFields.add('podFreeDays');
      if (row.poddem !== originalRow.poddem) modifiedFields.add('poddem');
      if (row.poddet !== originalRow.poddet) modifiedFields.add('poddet');
      if (row.voyage !== originalRow.voyage) modifiedFields.add('voyage');
      if (row.contractNo !== originalRow.contractNo)
        modifiedFields.add('contractNo');
      if (row.closeDocTime !== originalRow.closeDocTime)
        modifiedFields.add('closeDocTime');
      if (row.closeDocDayOfWeek !== originalRow.closeDocDayOfWeek)
        modifiedFields.add('closeDocDayOfWeek');
      if (row.closeDocDayTime !== originalRow.closeDocDayTime)
        modifiedFields.add('closeDocDayTime');
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
      if (modifiedFields.has('polFreeDays'))
        submitData.polFreeDays = row.polFreeDays;
      if (modifiedFields.has('podFreeDays'))
        submitData.podFreeDays = row.podFreeDays;
      if (modifiedFields.has('poddem')) submitData.poddem = row.poddem;
      if (modifiedFields.has('poddet')) submitData.poddet = row.poddet;
      if (modifiedFields.has('voyage')) submitData.voyage = row.voyage;
      if (modifiedFields.has('contractNo'))
        submitData.contractNo = row.contractNo;
      if (modifiedFields.has('closeDocTime'))
        submitData.closeDocTime = row.closeDocTime;
      if (modifiedFields.has('closeDocDayOfWeek'))
        submitData.closeDocDayOfWeek = row.closeDocDayOfWeek;
      if (modifiedFields.has('closeDocDayTime'))
        submitData.closeDocDayTime = row.closeDocDayTime;
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
      <div class="mb-4 flex items-center justify-end">
        <Space>
          <span class="text-gray-600">添加箱型：</span>
          <Select
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

      <!-- 提示信息 -->
      <div class="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
        <p><strong>提示：</strong></p>
        <ul class="list-inside list-disc">
          <li>已选择 {{ originalData.length }} 条记录进行批量编辑</li>
          <li>每一行都可以独立修改，系统会分别提交每行的修改</li>
          <li>使用"添加箱型"下拉框可以添加新的箱型成本列</li>
        </ul>
      </div>

      <!-- 表格 -->
      <Grid>
        <!-- 船公司 -->
        <template #carrierId="{ row }">
          <CarrierSelect
            v-model="row.carrierId"
            style="width: 100%"
            :selected-items="
              row.carrierId && carrierCache.has(row.carrierId)
                ? [carrierCache.get(row.carrierId)!]
                : []
            "
          />
        </template>

        <!-- 起运港 -->
        <template #polId="{ row }">
          <PortSelect
            v-model="row.polId"
            style="width: 100%"
            :selected-items="
              row.polId && portCache.has(row.polId)
                ? [portCache.get(row.polId)!]
                : []
            "
          />
        </template>

        <!-- 目的港 -->
        <template #podId="{ row }">
          <PortSelect
            v-model="row.podId"
            style="width: 100%"
            :selected-items="
              row.podId && portCache.has(row.podId)
                ? [portCache.get(row.podId)!]
                : []
            "
          />
        </template>

        <!-- 币别 -->
        <template #currencyId="{ row }">
          <CurrencySelect
            v-model="row.currencyId"
            style="width: 100%"
            :selected-items="
              row.currencyId && currencyCache.has(row.currencyId)
                ? [currencyCache.get(row.currencyId)!]
                : []
            "
          />
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
            :selected-items="
              row.poT1Id && portCache.has(row.poT1Id)
                ? [portCache.get(row.poT1Id)!]
                : []
            "
          />
        </template>

        <!-- 中转港2 -->
        <template #poT2Id="{ row }">
          <PortSelect
            v-model="row.poT2Id"
            style="width: 100%"
            allow-clear
            :disabled="row.isDirect"
            :selected-items="
              row.poT2Id && portCache.has(row.poT2Id)
                ? [portCache.get(row.poT2Id)!]
                : []
            "
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
              size="small"
            />

            <span class="text-sm text-gray-400">+</span>

            <!-- 免用箱期 (DET) -->
            <InputNumber
              v-model:value="row.podFreeDays"
              style="width: 60px"
              :min="0"
              placeholder="DET"
              size="small"
            />

            <span class="text-sm text-gray-400">=</span>

            <!-- 免箱使期（自动计算或手动输入） -->
            <InputNumber
              v-model:value="row.poddet"
              style="width: 60px"
              :min="0"
              placeholder="-"
              size="small"
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
                <Select.Option :value="0">日</Select.Option>
                <Select.Option :value="1">一</Select.Option>
                <Select.Option :value="2">二</Select.Option>
                <Select.Option :value="3">三</Select.Option>
                <Select.Option :value="4">四</Select.Option>
                <Select.Option :value="5">五</Select.Option>
                <Select.Option :value="6">六</Select.Option>
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
                <Select.Option :value="0">日</Select.Option>
                <Select.Option :value="1">一</Select.Option>
                <Select.Option :value="2">二</Select.Option>
                <Select.Option :value="3">三</Select.Option>
                <Select.Option :value="4">四</Select.Option>
                <Select.Option :value="5">五</Select.Option>
                <Select.Option :value="6">六</Select.Option>
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
