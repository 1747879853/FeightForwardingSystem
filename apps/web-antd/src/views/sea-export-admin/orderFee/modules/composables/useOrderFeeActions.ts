/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - 禁用此文件的 TypeScript 类型检查（原有代码的类型问题）
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

import { nextTick, h } from 'vue';
import { message, Modal, Textarea } from 'ant-design-vue';

import { $t } from '#/locales';

import * as feeConstants from '../../data';

import {
  batchEditOrderFee,
  batchDeleteOrderFee,
  generateOppositeOrderFees,
} from '#/api/sea-export/order-fee-admin';

import {
  submitOrderFee,
  modifyOrderFee,
  deleteOrderFee,
  OrderFeeTaskWithdraw,
} from '#/api/audit-approval/expense-admin';

// 类型别名
type OrderFeeRow = OrderFeeAdminApi.OrderFeeDto & { _rowKey?: string };

/**
 * 订单费用操作逻辑 Composable
 * 负责增删改查、提交、撤回等操作
 */
export function useOrderFeeActions(
  props: {
    type: number;
    mode?: string;
    parentChangeOrderId?: string;
  },
  dataContext: {
    dataSource: any;
    selectedRowKeys: any;
    editId: any;
    getTableDate: () => Promise<void>;
    syncFee: () => void;
    sanitizeOrderFee: (items: any[]) => OrderFeeAdminApi.OrderFeeEditDto[];
  },
  emit: any,
) {
  let rowKeyCounter = 0;

  /**
   * 添加新行
   */
  const addRow = () => {
    console.log('🔵 [addRow] 开始添加新行');
    console.log(
      '🔵 [addRow] 当前数据源长度:',
      dataContext.dataSource.value?.length || 0,
    );

    const list = [...(dataContext.dataSource.value ?? [])];
    const newRow = {
      _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}`,
      id: '',
      transportOrderId: dataContext.editId.value,
      paySide: props.type,
      currencyId: '',
      unit: '',
      feeStatus: 0,
      taxRate: 0,
      taskStatus: '',
      invoiceStatus: 0,
      invoiceBlocked: false, // ✅ 修改：新增费用时，不开发票默认为false（允许开票）
      isConfidential: false,
      dataEntryMethod: 0,
    } as any;

    list.push(newRow);
    console.log('🔵 [addRow] 新行的 _rowKey:', newRow._rowKey);
    console.log('🔵 [addRow] 添加后数据源长度:', list.length);

    // 直接更新 dataSource，触发响应式更新
    dataContext.dataSource.value = list;
    console.log('🔵 [addRow] 已更新 dataSource.value');

    // 等待 DOM 更新后同步费用
    nextTick(() => {
      dataContext.syncFee();
      console.log('🔵 [addRow] 已同步费用');
    });
  };

  /**
   * 获取选中的行
   */
  const getSelectedRows = (): OrderFeeAdminApi.OrderFeeDto[] => {
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    return (dataContext.dataSource.value ?? []).filter((row) => {
      const rowKey = (row as { _rowKey?: string })._rowKey;
      return rowKey !== undefined && keysSet.has(rowKey);
    });
  };

  /**
   * 判断是否已保存
   */
  const isSavedOrderFee = (row: OrderFeeAdminApi.OrderFeeDto) =>
    Boolean(row.id && String(row.id).trim());

  /**
   * 删除行
   */
  const delRow = () => {
    if (!dataContext.selectedRowKeys.value.length) return;
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? []).filter(
      (row) => !keysSet.has((row as any)._rowKey),
    );
    const needDelIds = (dataContext.dataSource.value ?? [])
      .filter((row) => keysSet.has((row as any)._rowKey))
      .filter((row) => (row as any).id !== '')
      .map((row) => (row as any).id);

    dataContext.selectedRowKeys.value = [];
    if (props.mode !== 'changeOrder' && needDelIds.length > 0) {
      batchDeleteOrderFee(needDelIds).then(() => {
        nextTick(() => {
          dataContext.dataSource.value = list;
          message.success({
            content: $t('ui.actionMessage.operationSuccess'),
            key: 'action_process_msg',
          });
        });
      });
    } else {
      nextTick(() => {
        dataContext.dataSource.value = list;
      });
    }
  };

  /**
   * 显示删除确认框（带备注）
   */
  const showDeleteWithRemark = () => {
    if (!dataContext.selectedRowKeys.value.length) return;

    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? []).filter((row) =>
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
    const modal = Modal.confirm({
      title: $t('auditApproval.task.okDelete'),
      content: () =>
        h('div', {}, [
          h(Textarea, {
            modelValue: modalRemark,
            onChange: (val: any) => {
              modalRemark = val.target?.value || val;
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
        await nextTick();
        submitDelete(modalRemark);
      },
      onCancel() {
        modalRemark = '';
      },
    });
  };

  /**
   * 收付互生费用
   */
  const generateOppositeFees = async () => {
    if (!dataContext.selectedRowKeys.value.length) {
      message.warning($t('请选择一条数据'));
      return;
    }

    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const selectedList = (dataContext.dataSource.value ?? []).filter((row) =>
      keysSet.has((row as any)._rowKey),
    );

    if (selectedList.length === 0) {
      message.warning($t('请选择一条数据'));
      return;
    }

    const changeOrderId =
      props.mode === 'changeOrder' ? props.parentChangeOrderId : undefined;

    const params: OrderFeeAdminApi.GenerateOppositeOrderFeesInputDto = {
      transportOrderId: dataContext.editId.value || '',
      paySide: props.type,
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

      await dataContext.getTableDate();
      dataContext.syncFee();
      emit('refresh-opposite-table');
    } catch (error) {
      console.error('❌ [generateOppositeFees] 收付互生失败:', error);
    }
  };

  /**
   * 提交费用
   */
  const Submitted = () => {
    if (!dataContext.selectedRowKeys.value.length) return;
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? [])
      .filter((row) => keysSet.has((row as any)._rowKey))
      .filter(
        (row) =>
          row.feeStatus === feeConstants.getFeeStatusValue.Entering ||
          row.feeStatus === feeConstants.getFeeStatusValue.Rejected ||
          row.feeStatus === feeConstants.getFeeStatusValue.ApplyModify,
      );
    let SubmitOrderFeeDto = {
      TransportOrderId: dataContext.editId.value,
      PaySide: props.type ?? 0,
      orderFees: dataContext.sanitizeOrderFee([...(list ?? [])]),
    };
    console.log(SubmitOrderFeeDto);
    submitOrderFee(SubmitOrderFeeDto).then(() => {
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
      dataContext.getTableDate();
    });
  };

  /**
   * 打开修改模态框
   */
  const openModifyModal = (modifyModalRef: any, orderBaseData: any) => {
    if (!dataContext.selectedRowKeys.value.length) return;
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? []).filter((row) =>
      keysSet.has((row as any)._rowKey),
    );

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

    const selectedFee = list[0];
    modifyModalRef.value?.modalApi.setData({
      feeData: selectedFee,
      orderBaseData: orderBaseData.value,
    });

    modifyModalRef.value?.modalApi.open();
  };

  /**
   * 处理模态框确认事件
   */
  const handleModalConfirm = (data: {
    originalData: OrderFeeAdminApi.OrderFeeDto | null;
    updatedData: OrderFeeAdminApi.OrderFeeDto | null;
  }) => {
    let list = [data.updatedData];
    let ModifyOrderFeeDto = {
      remark: data.updatedData?.remark || '',
      TransportOrderId: dataContext.editId.value,
      orderFees: dataContext.sanitizeOrderFee([...(list ?? [])]),
    };
    console.log(ModifyOrderFeeDto);
    modifyOrderFee(ModifyOrderFeeDto).then(() => {
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
      dataContext.getTableDate();
    });
  };

  /**
   * 提交修改
   */
  const submitModify = (remark: string) => {
    if (!dataContext.selectedRowKeys.value.length) return;
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? []).filter((row) =>
      keysSet.has((row as any)._rowKey),
    );
    let ModifyOrderFeeDto = {
      remark: remark,
      TransportOrderId: dataContext.editId.value,
      orderFees: dataContext.sanitizeOrderFee([...(list ?? [])]),
    };
    console.log(ModifyOrderFeeDto);
    modifyOrderFee(ModifyOrderFeeDto).then(() => {
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
      dataContext.getTableDate();
    });
  };

  /**
   * 提交删除
   */
  const submitDelete = (remark: string) => {
    if (!dataContext.selectedRowKeys.value.length) return;
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? []).filter((row) =>
      keysSet.has((row as any)._rowKey),
    );
    let DeleteOrderFeeDto = {
      remark: remark,
      TransportOrderId: dataContext.editId.value,
      orderFeeIds: list.map((item) => item.id),
    };
    console.log(DeleteOrderFeeDto);
    deleteOrderFee(DeleteOrderFeeDto).then(() => {
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
      dataContext.getTableDate();
    });
  };

  /**
   * 保存行
   */
  const saveRow = () => {
    const list = (dataContext.dataSource.value ?? []).filter(
      (row) =>
        row.feeStatus === feeConstants.getFeeStatusValue.Entering ||
        row.feeStatus === feeConstants.getFeeStatusValue.Rejected ||
        row.feeStatus === feeConstants.getFeeStatusValue.ApplyModify,
    );

    const editList = dataContext.sanitizeOrderFee(list);
    batchEditOrderFee(editList).then(() => {
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
      dataContext.getTableDate();
    });
  };

  /**
   * 撤回费用
   */
  const orderFeeWithdraw = () => {
    if (!dataContext.selectedRowKeys.value.length) return;
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? []).filter((row) =>
      keysSet.has((row as any)._rowKey),
    );

    let orderFeeWithdrawDto: ExpenseSubmissionAdminApi.OrderFeeTaskWithdrawDto =
      {
        orderFeeIds: list.map((item) => item.id),
      };
    OrderFeeTaskWithdraw(orderFeeWithdrawDto).then(() => {
      message.success({
        content: $t('ui.actionMessage.operationSuccess'),
        key: 'action_process_msg',
      });
      dataContext.getTableDate();
    });
  };

  /**
   * 移除选中的行
   */
  const removeSelectedRows = () => {
    if (!dataContext.selectedRowKeys.value.length) return;
    const keysSet = new Set(dataContext.selectedRowKeys.value);
    const list = (dataContext.dataSource.value ?? []).filter(
      (row) => !keysSet.has((row as any)._rowKey),
    );
    const needDelIds = (dataContext.dataSource.value ?? [])
      .filter((row) => keysSet.has((row as any)._rowKey))
      .filter((row) => (row as any).id !== '')
      .map((row) => (row as any).id);

    dataContext.selectedRowKeys.value = [];
    if (props.mode !== 'changeOrder' && needDelIds.length > 0) {
      batchDeleteOrderFee(needDelIds).then(() => {
        nextTick(() => {
          dataContext.dataSource.value = list;
          message.success({
            content: $t('ui.actionMessage.operationSuccess'),
            key: 'action_process_msg',
          });
        });
      });
    } else {
      nextTick(() => {
        dataContext.dataSource.value = list;
      });
    }
  };

  return {
    addRow,
    delRow,
    getSelectedRows,
    isSavedOrderFee,
    showDeleteWithRemark,
    generateOppositeFees,
    Submitted,
    openModifyModal,
    handleModalConfirm,
    submitModify,
    submitDelete,
    saveRow,
    orderFeeWithdraw,
    removeSelectedRows,
  };
}
