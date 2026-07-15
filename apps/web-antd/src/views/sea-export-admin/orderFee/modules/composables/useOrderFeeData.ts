import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';

import { $t } from '#/locales';

import * as feeConstants from '../../data';
import { setOrderCtnList } from '../../data';

import { getOrderFeePagedList } from '#/api/sea-export/order-fee-admin';
import { GetDetail } from '#/api/sea-export/change-order-admin';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';

/**
 * 订单费用数据管理 Composable
 * 负责数据的加载、同步、金额计算等逻辑
 */
export function useOrderFeeData(
  props: {
    type: number;
    mode?: string;
    parentChangeOrderId?: string;
    orderDetail?: SeaExportAdminApi.SeaExportDto | null;
  },
  emit: any,
) {
  const route = useRoute();

  // 数据源
  const dataSource = ref<OrderFeeAdminApi.OrderFeeDto[]>([]);

  // 选中的行 keys
  const selectedRowKeys = ref<(string | number)[]>([]);

  // 订单箱型列表
  const orderCtnList = ref<Array<{ ctnCodeId: number; ctnCodeName: string }>>(
    [],
  );

  // 订单基础数据
  const orderBaseData = ref<SeaExportAdminApi.SeaExportDto | null>(null);

  // 更改单 ID
  const changeOrderId = ref('');

  // 编辑 ID
  const editId = computed<string | undefined>(() => {
    const id = route.params.id;
    if (Array.isArray(id)) return id[0];
    return id ? String(id) : undefined;
  });

  /**
   * 应用订单详情：保存基础数据并提取箱型列表
   */
  const applyOrderDetail = (
    orderDetail: SeaExportAdminApi.SeaExportDto | null | undefined,
  ) => {
    orderBaseData.value = orderDetail ?? null;

    const orderCtns = orderDetail?.transportOrder?.orderCtns;
    if (orderCtns?.length) {
      const ctnMap = new Map<number, string>();
      orderCtns.forEach((ctn: any) => {
        if (ctn.ctnCodeId && ctn.ctnCodeName) {
          ctnMap.set(ctn.ctnCodeId, ctn.ctnCodeName);
        }
      });

      const ctnList = Array.from(ctnMap.entries()).map(([id, name]) => ({
        ctnCodeId: id,
        ctnCodeName: name,
      }));

      orderCtnList.value = ctnList;
      setOrderCtnList(ctnList);
    } else {
      orderCtnList.value = [];
      setOrderCtnList([]);
    }
  };

  /**
   * 为 orderFees 每项添加 _rowKey
   */
  const normalizeOrderFeeWithRowKey = (
    items: OrderFeeAdminApi.OrderFeeDto[] | undefined,
  ) => {
    if (!items?.length) return [];
    let rowKeyCounter = 0;
    return items.map((item, i) => ({
      ...item,
      industryCategory:
        item.industryCategory === 0 ? undefined : item.industryCategory,
      _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}`,
    })) as any[];
  };

  /**
   * 设置更改单费用
   */
  const setChangeOrderFee = async (id: string) => {
    if (id) {
      let res = await GetDetail(id);
      console.log(
        'res',
        res.orderFees.filter((item) => item.paySide === props.type),
      );
      let orderFees = res.orderFees.filter(
        (item) => item.paySide === props.type,
      );
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
      syncFee();
    } else {
      dataSource.value = [];
    }
  };

  /**
   * 查询表格数据
   */
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
      if (item.feeStatus === feeConstants.getFeeStatusValue.Approved) {
        const amount = item.amount || 0;
        const settledAmount = item.settledAmount || 0;

        if (settledAmount <= 0) {
          item.feeStatus = feeConstants.getFeeStatusValue.Approved;
        } else if (settledAmount >= amount) {
          item.feeStatus = feeConstants.getFeeStatusValue.Settled;
        } else if (settledAmount > 0 && settledAmount < amount) {
          item.feeStatus = feeConstants.getFeeStatusValue.PartialSettlement;
        }
      }
    });

    const normalizedData = normalizeOrderFeeWithRowKey(res.items);
    console.log('📊 [queryTableData] 加载数据:', normalizedData.length, '条');
    dataSource.value = normalizedData;

    // 触发 syncFee 以通知父组件和计算金额
    await nextTick();
    syncFee();
  };

  /**
   * 获取表格数据（对外暴露的方法）
   */
  const getTableDate = async (id = '') => {
    if (id) {
      changeOrderId.value = id;
    }
    await queryTableData();
  };

  /**
   * 同步费用数据
   */
  const syncFee = () => {
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

  /**
   * 计算并发送金额汇总数据
   */
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
    const uniqueCurrencyIds = [...new Set(currencyIdList)];

    uniqueCurrencyIds.forEach((currencyId) => {
      const currencyList = list.filter(
        (item) => item.currencyId === currencyId,
      );

      const totalAmount = currencyList.reduce((acc, cur) => {
        return acc + (cur.amount || 0);
      }, 0);

      const totalRMBAmount = currencyList.reduce((acc, cur) => {
        return acc + (cur.amount || 0) * (cur.exchangeRate || 1);
      }, 0);

      const exchangeRate = currencyList[0]?.exchangeRate || 1;
      const currencyName = currencyList[0]?.currencyName || '';

      if (currencyId !== undefined && currencyId !== null) {
        if (props.type === 0) {
          amountMap[currencyId] = {
            totalRecAmount: totalAmount,
            totalRMBRecAmount: totalRMBAmount,
            exchangeRate,
            currencyName,
            currencyId,
          };
        } else {
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

  /**
   * 提交时移除 _rowKey 等非 API 字段
   */
  const sanitizeOrderFee = (
    items: any[] | undefined,
  ): OrderFeeAdminApi.OrderFeeEditDto[] => {
    if (!items?.length) return [];

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

        if (val === undefined || val === null) continue;
        if (typeof val === 'string' && val === '') continue;

        if (numericFields.has(key)) {
          dto[key] = typeof val === 'number' ? val : Number(val);
          continue;
        }

        dto[key] = val;
      }
      return dto as OrderFeeAdminApi.OrderFeeEditDto;
    });
  };

  // 监听 orderDetail 变化
  watch(
    () => props.orderDetail,
    (detail) => {
      if (detail) applyOrderDetail(detail);
    },
    { immediate: true },
  );

  // 监听 dataSource 变化
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

  // 监听 editId 变化
  watch(
    () => editId.value,
    async (newEditId, oldEditId) => {
      if (newEditId && newEditId !== oldEditId) {
        try {
          const orderDetail = await getSeaExportDetail(newEditId);
          applyOrderDetail(orderDetail);
        } catch (error) {
          console.error('❌ [watch editId] 加载订单详情失败:', error);
        }
        getTableDate();
      }
    },
  );

  return {
    // 状态
    dataSource,
    selectedRowKeys,
    orderCtnList,
    orderBaseData,
    changeOrderId,
    editId,

    // 方法
    applyOrderDetail,
    normalizeOrderFeeWithRowKey,
    getTableDate,
    syncFee,
    sanitizeOrderFee,
  };
}
