<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, onMounted, ref, watch, h, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import {
  Button,
  Space,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Modal,
  Textarea,
  Tag,
  Card,
} from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

import { PrintJsonType, usePrintFormat } from '#/components/print-format';

import * as feeConstants from '../data';
import * as clientConstants from '#/views/client/base/data';

import { getFeeCodePagedList } from '#/api/system/base-data/fee-code-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';
import {
  batchEditOrderFee,
  getOrderFeePagedList,
  batchDeleteOrderFee,
  generateOppositeOrderFees,
} from '#/api/sea-export/order-fee-admin';

import {
  submitOrderFee,
  modifyOrderFee,
  deleteOrderFee,
  submitOrderFeeWithdrawAsync,
  OrderFeeTaskWithdraw,
} from '#/api/audit-approval/expense-admin';

import { GetDetail } from '#/api/sea-export/change-order-admin';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  useOrderFeeColumns,
  initOrderFeeEnumCache,
  setOrderCtnList,
  getOrderCtnList,
} from '../data';
import OrderFeeEditorModal from './order-fee-editor-modal.vue';
import OrderFeeAuditHistoryModal from './order-fee-audit-history-modal.vue';
import BatchImportFeeModal from './batch-import-fee-modal.vue';

const dataSource = defineModel<OrderFeeAdminApi.OrderFeeDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);
const printing = ref(false);
const { openPrint } = usePrintFormat();

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string; //更改单Id
  recAmountMap?: Record<string, any>; // 应收金额汇总
  payAmountMap?: Record<string, any>; // 应付金额汇总
}>();

const emit = defineEmits([
  'sync-fee',
  'update-amount',
  'refresh-opposite-table',
]);

const route = useRoute();

// 订单箱型列表（用于单位下拉框过滤）
const orderCtnList = ref<Array<{ ctnCodeId: number; ctnCodeName: string }>>([]);

// 订单基础数据（用于行业类别切换时自动填充结算对象）
const orderBaseData = ref<SeaExportAdminApi.SeaExportDto | null>(null);

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

// 订单基础数据（用于行业类别切换时自动填充结算对象）
const ORDER_CTN_API_KEYS: Array<
  Extract<keyof OrderFeeAdminApi.OrderFeeDto, string>
> = [
  'id',
  'transportOrderId',
  'paySide',
  'feeCodeId',
  'industryCategory',
  'settlementId',
  'currencyId',
  'exchangeRate',
  'unitPrice',
  'amount',
  'unit',
  'quantity',
  'taxRate',
  'noTaxUnitPrice',
  'noTaxAmount',
  'rqstPaymentAmount',
  'invoicedAmount',
  'orderInvoiceAmount',
  'settledAmount',
  'canInvoice',
  'isConfidential',
  'dataEntryMethod',
  'remark',
];
let rowKeyCounter = 0;

const setChangeOrderFee = async (id: string) => {
  if (id) {
    let res = await GetDetail(id);
    console.log(
      'res',
      res.orderFees.filter((item) => item.paySide === props.type),
    );
    let orderFees = res.orderFees.filter((item) => item.paySide === props.type);
    orderFees.forEach((item) => {
      item.taskStatus = '';
      if (
        item.modifyOrderFeeTasks &&
        item.modifyOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus = $t('auditApproval.task.typeOptions.ModifyOrderFee');
      } else if (
        item.deleteOrderFeeTasks &&
        item.deleteOrderFeeTasks[0]?.taskStatus === 0
      ) {
        item.taskStatus = $t('auditApproval.task.typeOptions.DeleteOrderFee');
      } else {
        item.taskStatus = '';
      }
    });

    dataSource.value = normalizeOrderFeeWithRowKey(orderFees);
    //更改单使用
    syncFee();
  } else {
    dataSource.value = [];
  }
};
const changeOrderId = ref('');

const getTableDate = async (id = '') => {
  if (id) {
    changeOrderId.value = id;
  }
  gridApi.query();
};

const queryTableData = async () => {
  if (props.mode === 'changeOrder') {
    return await setChangeOrderFee(changeOrderId.value);
  }

  let params = {
    TransportOrderId: editId.value,
    PaySide: props.type ?? 0,
    PageIndex: 1,
    PageSize: 999,
  };
  const res = await getOrderFeePagedList(params);
  res.items.forEach((item) => {
    item.taskStatus = '';
    if (
      item.modifyOrderFeeTasks &&
      item.modifyOrderFeeTasks[0]?.taskStatus === 0
    ) {
      item.taskStatus = $t('auditApproval.task.typeOptions.ModifyOrderFee');
    } else if (
      item.deleteOrderFeeTasks &&
      item.deleteOrderFeeTasks[0]?.taskStatus === 0
    ) {
      item.taskStatus = $t('auditApproval.task.typeOptions.DeleteOrderFee');
    } else {
      let modifyOrderFeeTasksLength =
        item.modifyOrderFeeTasks?.filter((item) => item.taskStatus === 2)
          .length || 0;
      if (modifyOrderFeeTasksLength > 0) {
        item.ModificationCount = modifyOrderFeeTasksLength || 0;
      }
      item.taskStatus = '';
    }

    // 根据结算状态重新计算费用状态
    // 只有审核通过的费用才需要根据结算金额调整状态
    if (item.feeStatus === feeConstants.getFeeStatusValue.Approved) {
      const amount = item.amount || 0;
      const settledAmount = item.settledAmount || 0;

      if (settledAmount <= 0) {
        // 未结算，保持审核通过状态
        item.feeStatus = feeConstants.getFeeStatusValue.Approved;
      } else if (settledAmount >= amount) {
        // 已完全结算
        item.feeStatus = feeConstants.getFeeStatusValue.Settled;
      } else if (settledAmount > 0 && settledAmount < amount) {
        // 部分结算
        item.feeStatus = feeConstants.getFeeStatusValue.PartialSettlement;
      }
    }
  });
  //  console.log('res', res.items);
  dataSource.value = normalizeOrderFeeWithRowKey(res.items);
};
const tmpAdd = ref(false); // ✅ 已废弃，保留以避免其他潜在引用
const tmpDel = ref(false); // ✅ 已废弃，保留以避免其他潜在引用

// 加载订单箱型列表和订单基础数据
const loadOrderCtnList = async () => {
  console.log('🔍 [loadOrderCtnList] 开始加载，editId:', editId.value);

  if (!editId.value) {
    console.warn('⚠️ [loadOrderCtnList] editId 为空，跳过加载');
    return;
  }

  try {
    const orderDetail = await getSeaExportDetail(editId.value);
    console.log('📦 [loadOrderCtnList] 订单详情:', orderDetail);
    console.log(
      '📦 [loadOrderCtnList] transportOrder:',
      orderDetail?.transportOrder,
    );
    console.log(
      '📦 [loadOrderCtnList] orderCtns:',
      orderDetail?.transportOrder?.orderCtns,
    );

    // 保存订单基础数据（用于行业类别切换时自动填充结算对象）
    orderBaseData.value = orderDetail;
    console.log('✅ [loadOrderCtnList] 已保存订单基础数据');

    if (orderDetail?.transportOrder?.orderCtns) {
      // 提取唯一的箱型列表
      const ctnMap = new Map<number, string>();
      orderDetail.transportOrder.orderCtns.forEach((ctn: any) => {
        console.log('📋 [loadOrderCtnList] 处理箱型:', ctn);
        if (ctn.ctnCodeId && ctn.ctnCodeName) {
          ctnMap.set(ctn.ctnCodeId, ctn.ctnCodeName);
        }
      });

      const ctnList = Array.from(ctnMap.entries()).map(([id, name]) => ({
        ctnCodeId: id,
        ctnCodeName: name,
      }));

      console.log('✅ [loadOrderCtnList] 提取的箱型列表:', ctnList);

      orderCtnList.value = ctnList;

      // 设置到 data.ts 模块中
      setOrderCtnList(ctnList);
      console.log('✅ [loadOrderCtnList] 已调用 setOrderCtnList');

      // 验证是否设置成功
      const verifyList = getOrderCtnList();
      console.log('🔍 [loadOrderCtnList] 验证 getOrderCtnList():', verifyList);
    } else {
      console.warn('⚠️ [loadOrderCtnList] orderCtns 不存在或为空');
      // 设置为空数组
      setOrderCtnList([]);
    }
  } catch (error) {
    console.error('❌ [loadOrderCtnList] 加载订单箱型列表失败:', error);
  }
};

// 模态框引用
const modifyModalRef = ref<InstanceType<typeof OrderFeeEditorModal>>();
const auditHistoryModalRef =
  ref<InstanceType<typeof OrderFeeAuditHistoryModal>>();
const batchImportModalRef = ref<InstanceType<typeof BatchImportFeeModal>>();

// 打开批量引入费用弹窗
const openBatchImportModal = async () => {
  // 获取当前订单的详细信息，用于设置默认检索条件
  console.log('🔍 [openBatchImportModal] 检查 editId:', editId.value);
  console.log('🔍 [openBatchImportModal] editId 类型:', typeof editId.value);

  if (!editId.value) {
    console.warn('⚠️ [openBatchImportModal] editId 为空');
    message.warning('请先保存业务信息');
    return;
  }

  try {
    console.log(
      '🔄 [openBatchImportModal] 开始调用 getSeaExportDetail, 参数:',
      editId.value,
    );
    const orderDetail = await getSeaExportDetail(editId.value);

    console.log('✅ [openBatchImportModal] 获取订单详情成功');
    console.log('📋 [openBatchImportModal] 订单详情:', orderDetail);
    console.log('📋 [openBatchImportModal] carrierId:', orderDetail?.carrierId);
    console.log('📋 [openBatchImportModal] polId:', orderDetail?.polId);
    console.log('📋 [openBatchImportModal] podId:', orderDetail?.podId);

    // 设置弹窗数据
    batchImportModalRef.value?.modalApi.setData({
      transportOrderId: editId.value,
      paySide: props.type, // 当前表格的收付类型（0=应收，1=应付）
      carrierId: orderDetail?.carrierId,
      polId: orderDetail?.polId,
      podId: orderDetail?.podId,
    });

    console.log('✅ [openBatchImportModal] 已设置弹窗数据，准备打开弹窗');

    // 打开弹窗
    batchImportModalRef.value?.modalApi.open();
  } catch (error) {
    console.error('❌ [openBatchImportModal] 获取订单详情失败:', error);
    console.error('❌ [openBatchImportModal] 错误对象:', error);
    console.error(
      '❌ [openBatchImportModal] 错误消息:',
      error instanceof Error ? error.message : '未知错误',
    );
    console.error(
      '❌ [openBatchImportModal] 错误堆栈:',
      error instanceof Error ? error.stack : '无堆栈信息',
    );

    const errorMsg = error instanceof Error ? error.message : '请稍后重试';
    message.error(`获取订单详情失败: ${errorMsg}`);
  }
};

// 处理批量导入确认
const handleBatchImportConfirm = () => {
  // 刷新当前表格数据
  getTableDate();

  // 通知父组件同步费用
  syncFee();

  // 通知父组件刷新对立表格
  emit('refresh-opposite-table');
};

// 打开审核历史弹窗
const openAuditHistoryModal = (row: OrderFeeAdminApi.OrderFeeDto) => {
  if (!row) return;
  console.log('row', row);
  // 设置数据并打开模态框
  auditHistoryModalRef.value?.modalApi.setData(row);
  auditHistoryModalRef.value?.modalApi.open();
};

const [Grid, gridApi] = useVbenVxeGrid<OrderFeeAdminApi.OrderFeeDto>({
  gridOptions: {
    id: `sea-export-order-fee-${props.type}`,
    columns: useOrderFeeColumns(props.type),
    height: '100%',
    maxHeight: 700,
    keepSource: true,
    radioConfig: {
      highlight: true,
      trigger: 'row',
    },
    rowConfig: {
      keyField: '_rowKey',
    },
    checkboxConfig: {
      highlight: true,
      reserve: true,
      trigger: 'row',
    },
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async () => {
          // ✅ 简化查询逻辑，直接返回数据源
          await queryTableData();
          return dataSource.value;
        },
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
  gridEvents: {
    // 双击单元格事件 - 当双击费用状态列时打开审核历史
    cellDblclick: ({ column, row }: any) => {
      // 检查是否是费用状态列
      if (column?.field === 'feeStatus') {
        openAuditHistoryModal(row);
      }
    },

    // 单行选择变化事件
    checkboxChange: ({ row, checked }) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      selectedRowKeys.value = records.map((r: any) => r._rowKey);

      // 可以在这里处理业务逻辑
    },

    // 全选/取消全选事件
    checkboxAll: ({ checked }) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      selectedRowKeys.value = records.map((r: any) => r._rowKey);
    },

    // 单选模式下的选择事件（如果使用 radio 类型）
    radioChange: ({ row }) => {
      //    console.log('单选选中:', row);
    },
  },
});
const addRowData = () => {
  const newRow = {
    _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}`,
    id: '',
    transportOrderId: editId.value,
    paySide: props.type,
    currencyId: '',
    unit: '',
    feeStatus: 0,
    taxRate: 0,
    taskStatus: '',
    invoiceStatus: 0,
    canInvoice: true,
    isConfidential: false,
    dataEntryMethod: 0,
  } as any;

  // ✅ 使用 VxeTable 的 insertAt 方法在末尾插入新行
  gridApi.grid?.insertAt(newRow, -1);

  // 同时更新 dataSource 以保持数据一致性
  const list = [...(dataSource.value ?? [])];
  list.push(newRow);
  dataSource.value = list;

  console.log('✅ [addRowData] 已添加新行，当前行数:', dataSource.value.length);
};

const addRow = () => {
  // ✅ 直接调用 addRowData，避免触发完整的表格重新渲染
  addRowData();
};

const delRow = () => {
  // ✅ 删除操作也直接处理
  removeSelectedRows();
};

const getSelectedRows = (): OrderFeeAdminApi.OrderFeeDto[] => {
  const fromGrid = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as OrderFeeAdminApi.OrderFeeDto[];
  if (fromGrid.length) return fromGrid;

  const keysSet = new Set(selectedRowKeys.value);
  return (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as { _rowKey?: string })._rowKey),
  );
};

const isSavedOrderFee = (row: OrderFeeAdminApi.OrderFeeDto) =>
  Boolean(row.id && String(row.id).trim());

const handlePrint = async () => {
  if (printing.value) return;

  const selected = getSelectedRows();
  if (!selected.length) {
    message.warning($t('common.selectDataFirst'));
    return;
  }
  if (selected.some((row) => !isSavedOrderFee(row))) {
    message.warning('请先保存费用后再打印');
    return;
  }

  printing.value = true;
  const hideLoading = message.loading('正在准备打印...', 0);
  try {
    const json = JSON.stringify(
      selected.map((row) => {
        const { _rowKey, ...fee } = row as OrderFeeAdminApi.OrderFeeDto & {
          _rowKey?: string;
        };
        return fee;
      }),
    );
    openPrint({
      printJsonType:
        props.type === 0
          ? PrintJsonType.RecOrderFeeList
          : PrintJsonType.PayOrderFeeList,
      json,
    });
  } catch {
    message.error('打印准备失败，请稍后重试');
  } finally {
    hideLoading();
    printing.value = false;
  }
};

const showDeleteWithRemark = () => {
  if (!selectedRowKeys.value.length) return;

  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  // 验证：只有费用状态是审核通过，并且已开票金额、发票申请金额、已结算金额、申请付款金额全是0，才可以申请删除
  const invalidRows = list.filter((row) => {
    const isApproved =
      row.feeStatus === feeConstants.getFeeStatusValue.Approved;
    const hasInvoicedAmount = (row.invoicedAmount || 0) !== 0;
    const hasOrderInvoiceAmount = (row.orderInvoiceAmount || 0) !== 0;
    const hasSettledAmount = (row.settledAmount || 0) !== 0;
    const hasRqstPaymentAmount = (row.rqstPaymentAmount || 0) !== 0;

    return (
      !isApproved ||
      hasInvoicedAmount ||
      hasOrderInvoiceAmount ||
      hasSettledAmount ||
      hasRqstPaymentAmount
    );
  });

  if (invalidRows.length > 0) {
    message.error({
      content: '当前费用不允许申请更改',
      key: 'action_process_msg',
    });
    return;
  }

  let modalRemark = '';
  // 创建弹窗实例
  const modal = Modal.confirm({
    title: $t('auditApproval.task.okDelete'),
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
            //     console.log('Textarea changed:', modalRemark);
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkDeletePlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await nextTick(); // 等待 Vue 响应式更新完成
      //  console.log('remark onOk:', modalRemark);
      submitDelete(modalRemark);
    },
    onCancel() {
      modalRemark = '';
    },
  });
};
const ImportOther = async (e: any) => {
  //console.log('SubmittedOther', e);
  switch (e.key) {
    case 'submit': {
      generateOppositeFees();
      break;
    }
  }
};
const SubmittedOther = async (e: any) => {
  //console.log('SubmittedOther', e);
  switch (e.key) {
    case 'modify': {
      openModifyModal();
      break;
    }
    case 'delete': {
      showDeleteWithRemark();
      break;
    }
  }
};
const orderFeeWithdraw = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  // const okList = list.filter(
  //   (item) => item?.submitOrderFeeTasks[0]?.taskStatus === 0,
  // );
  // if (okList.length === 0) {
  //   console.log('no_task_status', list);
  //   message.error({
  //     content: $t('ui.actionMessage.operationFailed'),
  //     key: 'action_process_msg',
  //   });
  //   return;
  // }
  // let taskBaseId = okList[0]?.submitOrderFeeTasks[0]?.taskBaseId;
  let orderFeeWithdrawDto: ExpenseSubmissionAdminApi.OrderFeeTaskWithdrawDto = {
    orderFeeIds: list.map((item) => item.id),
  };
  OrderFeeTaskWithdraw(orderFeeWithdrawDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

// 收付互生费用（应收生成应付 / 应付生成应收）
const generateOppositeFees = async () => {
  if (!selectedRowKeys.value.length) {
    message.warning($t('请选择一条数据'));
    return;
  }

  const keysSet = new Set(selectedRowKeys.value);
  const selectedList = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  if (selectedList.length === 0) {
    message.warning($t('请选择一条数据'));
    return;
  }

  // 获取当前更改单ID（如果有）
  const changeOrderId =
    props.mode === 'changeOrder' ? props.parentChangeOrderId : undefined;

  // 构建请求参数
  const params: OrderFeeAdminApi.GenerateOppositeOrderFeesInputDto = {
    transportOrderId: editId.value || '',
    paySide: props.type, // 当前表格的收付类型（0=收，1=付）
    orderFeeIds: selectedList.map((item) => item.id),
    changeOrderId: changeOrderId,
  };

  console.log('🔄 [generateOppositeFees] 收付互生参数:', params);

  try {
    const result = await generateOppositeOrderFees(params);
    console.log('✅ [generateOppositeFees] 生成的费用ID列表:', result);

    message.success({
      content: `成功生成 ${result.length} 条${props.type === 0 ? '应付' : '应收'}费用`,
      key: 'action_process_msg',
    });

    // 刷新当前表格数据
    await getTableDate();

    // 通知父组件同步费用（触发emit事件）
    syncFee();

    // 通知父组件刷新对立表格（应收生成应付时刷新应付表，反之亦然）
    emit('refresh-opposite-table');
  } catch (error) {
    console.error('❌ [generateOppositeFees] 收付互生失败:', error);
    // message.error({
    //   content: '收付互生失败，请检查费用状态和配置',
    //   key: 'action_process_msg',
    // });
  }
};

const Submitted = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? [])
    .filter((row) => keysSet.has((row as any)._rowKey))
    .filter(
      (row) =>
        row.feeStatus === feeConstants.getFeeStatusValue.Entering ||
        row.feeStatus === feeConstants.getFeeStatusValue.Rejected ||
        row.feeStatus === feeConstants.getFeeStatusValue.ApplyModify,
    );
  let SubmitOrderFeeDto = {
    TransportOrderId: editId.value,
    PaySide: props.type ?? 0,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(SubmitOrderFeeDto);
  submitOrderFee(SubmitOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const openModifyModal = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  // 验证：只有费用状态是审核通过，并且已开票金额、发票申请金额、已结算金额、申请付款金额全是0，才可以申请修改
  const invalidRows = list.filter((row) => {
    const isApproved =
      row.feeStatus === feeConstants.getFeeStatusValue.Approved;
    const hasInvoicedAmount = (row.invoicedAmount || 0) !== 0;
    const hasOrderInvoiceAmount = (row.orderInvoiceAmount || 0) !== 0;
    const hasSettledAmount = (row.settledAmount || 0) !== 0;
    const hasRqstPaymentAmount = (row.rqstPaymentAmount || 0) !== 0;

    return (
      !isApproved ||
      hasInvoicedAmount ||
      hasOrderInvoiceAmount ||
      hasSettledAmount ||
      hasRqstPaymentAmount
    );
  });

  if (invalidRows.length > 0) {
    message.error({
      content: '当前费用不允许申请更改',
      key: 'action_process_msg',
    });
    return;
  }

  if (list.length > 1) {
    message.error({
      content: $t('ui.actionMessage.lengthLimit1'),
      key: 'action_process_msg',
    });
    return;
  }

  // 打开模态框，传递选中的费用数据、合计数据和订单基础数据
  const selectedFee = list[0];
  console.log('📊 [父组件] selectedFee:', selectedFee);
  console.log(
    '📊 [父组件] orderBaseData.value 是否存在:',
    !!orderBaseData.value,
  );
  console.log('📊 [父组件] 准备传递给子组件的数据:', {
    feeData: selectedFee,
    hasOrderBaseData: !!orderBaseData.value,
    orderBaseDataKeys: orderBaseData.value
      ? Object.keys(orderBaseData.value)
      : [],
  });

  modifyModalRef.value?.modalApi.setData({
    feeData: selectedFee,
    orderBaseData: orderBaseData.value,
  });

  console.log('✅ [父组件] 已调用 setData，准备打开模态框');
  modifyModalRef.value?.modalApi.open();
};

// 处理模态框确认事件
const handleModalConfirm = (data: {
  originalData: OrderFeeAdminApi.OrderFeeDto | null;
  updatedData: OrderFeeAdminApi.OrderFeeDto | null;
}) => {
  //console.log('模态框确认:', data);
  let list = [data.updatedData];
  // TODO: 这里可以添加保存逻辑，调用API更新费用
  let ModifyOrderFeeDto = {
    remark: data.updatedData?.remark || '',
    TransportOrderId: editId.value,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(ModifyOrderFeeDto);
  modifyOrderFee(ModifyOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const submitModify = (remark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let ModifyOrderFeeDto = {
    remark: remark,
    TransportOrderId: editId.value,
    orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(ModifyOrderFeeDto);
  modifyOrderFee(ModifyOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};

const submitDelete = (remark: string) => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const list = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );
  let DeleteOrderFeeDto = {
    remark: remark,
    TransportOrderId: editId.value,
    orderFeeIds: list.map((item) => item.id),
    //orderFees: sanitizeOrderFee([...(list ?? [])]),
  };
  console.log(DeleteOrderFeeDto);
  deleteOrderFee(DeleteOrderFeeDto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeOrderFeeWithRowKey = (
  items: OrderFeeAdminApi.OrderFeeDto[] | undefined,
) => {
  if (!items?.length) return [];
  console.log('normalizeOrderFeeWithRowKey', items);
  return items.map((item, i) => ({
    ...item,
    industryCategory:
      item.industryCategory === 0 ? null : item.industryCategory, // 确保行业类别有默认值，避免编辑时下拉框异常
    _rowKey: `ofee_${i}_${Date.now()}`,
  })) as any[];
};

/** 提交时移除 _rowKey 等非 API 字段，仅保留 OrderCtnAddDto 字段 */
const sanitizeOrderFee = (
  items: any[] | undefined,
): OrderFeeAdminApi.OrderFeeEditDto[] => {
  if (!items?.length) return [];

  // 定义必须保留的数字类型字段（即使值为0也要保留）
  const numericFields = new Set([
    'currencyId',
    'feeCodeId',
    'paySide',
    'feeStatus',
    'invoiceStatus',
    'industryCategory',
    'dataEntryMethod',
  ]);

  return items.map((item) => {
    const dto: Record<string, any> = {};
    for (const key of ORDER_CTN_API_KEYS) {
      const val = item[key];

      // 跳过 undefined 和 null
      if (val === undefined || val === null) continue;

      // 对于字符串类型，跳过空字符串
      if (typeof val === 'string' && val === '') continue;

      // 对于数字类型字段，即使是0也要保留
      if (numericFields.has(key)) {
        dto[key] = typeof val === 'number' ? val : Number(val);
        continue;
      }

      dto[key] = val;
    }
    return dto as OrderFeeAdminApi.OrderFeeEditDto;
  });
};
const saveRow = () => {
  const list = (dataSource.value ?? []).filter(
    (row) =>
      row.feeStatus === feeConstants.getFeeStatusValue.Entering ||
      row.feeStatus === feeConstants.getFeeStatusValue.Rejected ||
      row.feeStatus === feeConstants.getFeeStatusValue.ApplyModify,
  );

  console.log(list);
  // 转换为OrderFeeEditDto类型
  const editList = sanitizeOrderFee(list);
  batchEditOrderFee(editList).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    getTableDate();
  });
};
const removeSelectedRows = () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);

  // 获取需要删除的行
  const rowsToDelete = (dataSource.value ?? []).filter((row) =>
    keysSet.has((row as any)._rowKey),
  );

  const needDelIds = rowsToDelete
    .filter((row) => (row as any).id !== '')
    .map((row) => (row as any).id);

  selectedRowKeys.value = [];

  if (props.mode !== 'changeOrder' && needDelIds.length > 0) {
    batchDeleteOrderFee(needDelIds).then(() => {
      // ✅ 使用 VxeTable 的 removeCheckboxRow 方法删除选中的行
      gridApi.grid?.removeCheckboxRow();

      // 同时更新 dataSource
      const list = (dataSource.value ?? []).filter(
        (row) => !keysSet.has((row as any)._rowKey),
      );
      dataSource.value = list;

      console.log(
        '✅ [removeSelectedRows] 已删除行（API），当前行数:',
        dataSource.value.length,
      );
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
    });
  } else {
    // ✅ 使用 VxeTable 的 removeCheckboxRow 方法删除选中的行
    gridApi.grid?.removeCheckboxRow();

    // 同时更新 dataSource
    const list = (dataSource.value ?? []).filter(
      (row) => !keysSet.has((row as any)._rowKey),
    );
    dataSource.value = list;

    console.log(
      '✅ [removeSelectedRows] 已删除行（本地），当前行数:',
      dataSource.value.length,
    );
  }
};

const syncFee = () => {
  // const list = (dataSource.value ?? []).filter(
  //   (row) => row.feeStatus === feeConstants.getFeeStatusValue.Entering,
  // );
  const list = dataSource.value ?? [];
  const syncFeeDto = {
    type: props.type ?? 0,
    orderFees: list,
  };
  console.log('费用同步', syncFeeDto);
  emit('sync-fee', syncFeeDto);

  // 实时计算当前表格的金额汇总
  calculateAndEmitAmount(list);
};

// 计算并发送金额汇总数据
const calculateAndEmitAmount = (list: OrderFeeAdminApi.OrderFeeDto[]) => {
  if (!list || list.length === 0) {
    emit('update-amount', {
      type: props.type ?? 0,
      amountMap: {},
    });
    return;
  }

  const amountMap: Record<string, any> = {};
  const currencyIdList = list.map((item) => item.currencyId).filter(Boolean);

  // 去重处理
  const uniqueCurrencyIds = [...new Set(currencyIdList)];

  uniqueCurrencyIds.forEach((currencyId) => {
    const currencyList = list.filter((item) => item.currencyId === currencyId);

    const totalAmount = currencyList.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);

    const totalRMBAmount = currencyList.reduce((acc, cur) => {
      return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
    }, 0);

    const exchangeRate = currencyList[0]?.exchangeRate || 1;
    const currencyName = currencyList[0]?.currencyName || '';

    if (currencyId !== undefined && currencyId !== null) {
      // 根据类型设置不同的字段名
      if (props.type === 0) {
        // 应收
        amountMap[currencyId] = {
          totalRecAmount: totalAmount,
          totalRMBRecAmount: totalRMBAmount,
          exchangeRate,
          currencyName,
          currencyId,
        };
      } else {
        // 应付
        amountMap[currencyId] = {
          totalPayAmount: totalAmount,
          totalRMBPayAmount: totalRMBAmount,
          exchangeRate,
          currencyName,
          currencyId,
        };
      }
    }
  });

  console.log(
    `💰 [${props.type === 0 ? '应收' : '应付'}] 金额汇总更新:`,
    amountMap,
  );

  emit('update-amount', {
    type: props.type ?? 0,
    amountMap,
  });
};

watch(
  () => dataSource.value,
  (val) => {
    if (val === undefined || val === null) {
      dataSource.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
    syncFee();
  },
  { immediate: true },
);

// 监听 editId 变化，重新加载箱型数据
watch(
  () => editId.value,
  async (newEditId, oldEditId) => {
    // 只在 editId 真正变化时才重新加载（排除初始化）
    if (newEditId && newEditId !== oldEditId) {
      console.log(
        '🔄 [watch editId] editId 变化，重新加载箱型数据:',
        newEditId,
      );
      await loadOrderCtnList();
      // 重新加载表格数据
      getTableDate();
    }
  },
);

const feeCodeList = ref<FeeCodeAdminApi.FeeCodeDto[]>([]);
const getFeeCodeList = async () => {
  let res = (await getFeeCodePagedList({ PageIndex: 1, PageSize: 1000 })) || {};
  feeCodeList.value = res.items || [];
  //console.log('feeCodeList', feeCodeList.value);
};
onMounted(async () => {
  // 初始化枚举数据缓存
  initOrderFeeEnumCache();

  // 先加载订单箱型列表，确保表格渲染时数据已就绪
  await loadOrderCtnList();

  // 再加载表格数据
  getTableDate();
  getFeeCodeList();
});
defineExpose({
  getTableDate,
});
</script>

<template>
  <Card class="order-fee-card">
    <div class="px-1">
      <div>
        <div class="order-ctn-table">
          <Grid
            :table-title="
              type === 0
                ? $t('seaExport.export.orderFee.receivableCharges')
                : $t('seaExport.export.orderFee.payableCharges')
            "
          >
            <template #toolbar-tools>
              <Space>
                <Button type="primary" @click="addRow">
                  {{ $t('common.create') }}
                </Button>
                <Button
                  type="primary"
                  @click="saveRow"
                  v-show="props.mode !== 'changeOrder'"
                >
                  {{ $t('common.save') }}
                </Button>
                <Button
                  v-show="props.mode !== 'changeOrder'"
                  :disabled="!selectedRowKeys.length"
                  :loading="printing"
                  @click="handlePrint"
                >
                  <IconifyIcon
                    icon="mdi:printer-outline"
                    class="mr-1 inline-block size-3.5 align-middle"
                  />
                  打印
                </Button>

                <Button
                  danger
                  :disabled="!selectedRowKeys.length"
                  @click="removeSelectedRows"
                >
                  {{ $t('common.delete') }}
                </Button>

                <DropdownButton @click="openBatchImportModal" type="primary">
                  {{ $t('seaExport.export.orderFee.batchImport') }}
                  <template #overlay>
                    <Menu @click="ImportOther">
                      <MenuItem key="submit">
                        {{ type === 0 ? '应收生成应付' : '应付生成应收' }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <DropdownButton
                  @click="Submitted"
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                >
                  {{ $t('auditApproval.status.Submitted') }}
                  <template #overlay>
                    <Menu @click="SubmittedOther">
                      <MenuItem key="modify">
                        {{ $t('auditApproval.ApplyModification') }}
                      </MenuItem>
                      <MenuItem key="delete">
                        {{ $t('auditApproval.ApplyDeletion') }}
                      </MenuItem>
                    </Menu>
                  </template>
                </DropdownButton>

                <Button
                  type="primary"
                  :disabled="!selectedRowKeys.length"
                  @click="orderFeeWithdraw"
                  >{{ $t('auditApproval.withdraw') }}</Button
                >
              </Space>
            </template>
          </Grid>
        </div>
      </div>
    </div>

    <!-- 费用编辑模态框 -->
    <OrderFeeEditorModal
      ref="modifyModalRef"
      :rec-amount-map="recAmountMap || {}"
      :pay-amount-map="payAmountMap || {}"
      :fee-code-list="feeCodeList"
      @confirm="handleModalConfirm"
    />

    <!-- 审核历史模态框 -->
    <OrderFeeAuditHistoryModal ref="auditHistoryModalRef" />

    <!-- 批量引入费用模态框 -->
    <BatchImportFeeModal
      ref="batchImportModalRef"
      @confirm="handleBatchImportConfirm"
    />
  </Card>
</template>

<style scoped lang="scss">
.order-fee-card {
  :deep(.ant-card-body) {
    padding: 0 20px 12px !important;
  }

  .order-ctn-table {
    display: flex;
    flex-direction: column;
    height: 500px;
  }

  :deep(.vxe-grid) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :deep(.vxe-table--body-wrapper) {
    display: flex;
    flex: 1;
    min-height: 0;
    padding-bottom: 8px;
    overflow-y: auto;
  }

  // 优化横向滚动条样式
  :deep(.vxe-table--scroll-x) {
    height: 16px !important;

    &::-webkit-scrollbar {
      height: 16px !important;
    }

    &::-webkit-scrollbar-track {
      background: #f5f5f5;
      border-radius: 8px;
    }

    &::-webkit-scrollbar-thumb {
      min-width: 40px;
      background: #c1c1c1;
      border-radius: 8px;

      &:hover {
        background: #a8a8a8;
      }

      &:active {
        background: #8a8a8a;
      }
    }
  }

  // 优化纵向滚动条样式（如果需要）
  :deep(.vxe-table--scroll-y) {
    width: 16px !important;

    &::-webkit-scrollbar {
      width: 16px !important;
    }

    &::-webkit-scrollbar-track {
      background: #f5f5f5;
      border-radius: 8px;
    }

    &::-webkit-scrollbar-thumb {
      min-height: 40px;
      background: #c1c1c1;
      border-radius: 8px;

      &:hover {
        background: #a8a8a8;
      }

      &:active {
        background: #8a8a8a;
      }
    }
  }
}
</style>
