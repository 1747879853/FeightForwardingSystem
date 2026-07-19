import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';

import { $t } from '#/locales';

import * as feeConstants from '../../data';
import { setOrderCtnList, getIndustryCategoryOptions } from '../../data';

import { getOrderFeePagedList } from '#/api/sea-export/order-fee-admin';
import { GetDetail } from '#/api/sea-export/change-order-admin';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';

/**
 * 从订单详情中提取所有可能的结算对象映射
 */
const extractSettlementNameMap = (
  orderDetail: SeaExportAdminApi.SeaExportDto | null | undefined,
): Map<any, string> => {
  const nameMap = new Map<any, string>();

  if (!orderDetail) return nameMap;

  const transportOrder = orderDetail.transportOrder;

  // 委托单位（主要客户）
  if (transportOrder?.clientId && transportOrder.clientName) {
    nameMap.set(transportOrder.clientId, transportOrder.clientName);
  }

  // 发货人
  if (transportOrder?.shipperId) {
    try {
      const name = transportOrder.shipperName;
      if (name) {
        nameMap.set(transportOrder.shipperId, name);
      }
    } catch (e) {
      console.warn('解析发货人信息失败:', e);
    }
  }

  // 收货人
  if (transportOrder?.consigneeId) {
    try {
      const name = transportOrder.consigneeName;
      if (name) {
        nameMap.set(transportOrder.consigneeId, name);
      }
    } catch (e) {
      console.warn('解析收货人信息失败:', e);
    }
  }

  // 通知人
  if (transportOrder?.notifierId) {
    try {
      const name = transportOrder.notifierName;
      if (name) {
        nameMap.set(transportOrder.notifierId, name);
      }
    } catch (e) {
      console.warn('解析通知人信息失败:', e);
    }
  }

  // 目的港代理
  if (orderDetail.podAgentId && orderDetail.podAgentName) {
    nameMap.set(orderDetail.podAgentId, orderDetail.podAgentName);
  }

  // 订舱代理
  if (orderDetail.bookingAgentId && orderDetail.bookingAgentName) {
    nameMap.set(orderDetail.bookingAgentId, orderDetail.bookingAgentName);
  }

  // 船代
  if (orderDetail.shipAgentId && orderDetail.shipAgentName) {
    nameMap.set(orderDetail.shipAgentId, orderDetail.shipAgentName);
  }

  // 场站
  if (orderDetail.yardId && orderDetail.yardName) {
    nameMap.set(orderDetail.yardId, orderDetail.yardName);
  }

  // 车队
  if (transportOrder?.teamId && transportOrder.teamName) {
    nameMap.set(transportOrder.teamId, transportOrder.teamName);
  }

  // 报关行
  if (transportOrder?.custBrokerId && transportOrder.custBrokerName) {
    nameMap.set(transportOrder.custBrokerId, transportOrder.custBrokerName);
  }

  // 仓库
  if (transportOrder?.warehouseId && transportOrder.warehouseName) {
    nameMap.set(transportOrder.warehouseId, transportOrder.warehouseName);
  }

  // 保险公司
  if (transportOrder?.insuranceId && transportOrder.insuranceName) {
    nameMap.set(transportOrder.insuranceId, transportOrder.insuranceName);
  }

  return nameMap;
};

/**
 * 为费用数据填充结算对象名称
 */
const fillSettlementNames = (
  fees: OrderFeeAdminApi.OrderFeeDto[],
  settlementNameMap: Map<any, string>,
): OrderFeeAdminApi.OrderFeeDto[] => {
  return fees.map((fee) => {
    const feeWithKey = fee as any;
    if (feeWithKey.settlementId && !feeWithKey.__settlementName) {
      const name = settlementNameMap.get(feeWithKey.settlementId);
      if (name) {
        feeWithKey.__settlementName = name;
        console.log('✅ [fillSettlementNames] 填充结算对象名称:', name);
      }
    }
    return feeWithKey;
  });
};

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
   * 为 orderFees 每项添加 _rowKey 和 _value 字段
   */
  const normalizeOrderFeeWithRowKey = (
    items: OrderFeeAdminApi.OrderFeeDto[] | undefined,
  ) => {
    if (!items?.length) return [];
    let rowKeyCounter = 0;
    return items.map((item, i) => {
      // ✅ 处理行业类别：优先使用 industryCategory（数值ID）
      let industryCategoryValue: number | undefined;

      if (item.industryCategory && item.industryCategory !== 0) {
        // 直接使用后端返回的数值ID
        industryCategoryValue = item.industryCategory;
      } else if (item.industryCategories) {
        // 回退：如果有字母代码，转换为数值ID
        const option = getIndustryCategoryOptions().find(
          (opt) => opt.value === item.industryCategories,
        );
        industryCategoryValue = option?.key;
      }

      // ✅ 初始化 _value 字段，用于存储实际的 value 值
      const normalizedItem = {
        ...item,
        industryCategory: industryCategoryValue, // ✅ 存储数值ID
        _rowKey: `ofee_${++rowKeyCounter}_${Date.now()}`,
      };

      // ✅ 为下拉框字段初始化 _value 字段
      // feeCodeId: 需要获取费用代码详情来获取 label
      if (normalizedItem.feeCodeId) {
        normalizedItem['feeCodeId_value'] = normalizedItem.feeCodeId;
      }

      // industryCategory: 已经存储的是数值ID
      if (normalizedItem.industryCategory) {
        normalizedItem['industryCategory_value'] =
          normalizedItem.industryCategory;
      }

      // currencyId: 直接存储币别ID
      if (normalizedItem.currencyId) {
        normalizedItem['currencyId_value'] = normalizedItem.currencyId;
      }

      // unit: 单位本身就是字符串，_value 也存储相同的值
      if (normalizedItem.unit) {
        normalizedItem['unit_value'] = normalizedItem.unit;
      }

      // settlementId: 结算对象ID
      if (normalizedItem.settlementId) {
        normalizedItem['settlementId_value'] = normalizedItem.settlementId;
      }

      return normalizedItem as any[];
    });
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

      // 从订单详情中提取结算对象名称映射
      const settlementNameMap = extractSettlementNameMap(props.orderDetail);
      // 为费用数据填充结算对象名称
      const feesWithNames = fillSettlementNames(orderFees, settlementNameMap);

      dataSource.value = normalizeOrderFeeWithRowKey(feesWithNames);
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
      Sorting: 'creationTime asc',
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

    // 从订单详情中提取结算对象名称映射
    const settlementNameMap = extractSettlementNameMap(props.orderDetail);
    // 为费用数据填充结算对象名称
    const feesWithNames = fillSettlementNames(res.items, settlementNameMap);

    const normalizedData = normalizeOrderFeeWithRowKey(feesWithNames);
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
   * 提交时移除 _rowKey 等非 API 字段，并使用 _value 字段的实际值
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
      'invoiceBlocked',
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
      'dataEntryMethod',
    ]);

    return items.map((item) => {
      //console.log("AAA", item)
      const dto: Record<string, any> = {};
      for (const key of ORDER_CTN_API_KEYS) {
        // ✅ 关键修改：优先使用 _value 字段的值（如果存在）
        let val =
          item[`${key}_value`] !== undefined ? item[`${key}_value`] : item[key];

        if (val === undefined || val === null) continue;
        if (typeof val === 'string' && val === '') continue;

        if (numericFields.has(key)) {
          dto[key] = typeof val === 'number' ? val : Number(val);
          continue;
        }

        // ✅ 特殊处理：将 industryCategory（数值ID）直接保存到大写的 IndustryCategory
        if (key === 'industryCategory') {
          const numericValue = typeof val === 'number' ? val : Number(val);
          if (!isNaN(numericValue)) {
            dto['IndustryCategory'] = numericValue;
            console.log(
              '✅ [sanitizeOrderFee] 保存 industryCategory:',
              numericValue,
              '(数值ID) → IndustryCategory',
            );
          } else {
            console.warn(
              '⚠️ [sanitizeOrderFee] industryCategory 不是有效数字:',
              val,
            );
          }
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
