import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';

import { getFeeCodeDetail } from '#/api/system/base-data/fee-code-admin';
import { getExchangeRateDetail } from '#/api/system/base-data/exchange-rate-admin';
import { getCtnCodeDetail } from '#/api/system/base-data/ctn-code-admin';
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';
import { getIndustryCategoryOptions } from '../../data';

/**
 * 订单费用字段联动逻辑 Composable
 * 负责费用代码、行业类别、币别等字段的联动和数据填充
 */
export function useOrderFeeLinkage(
  props: {
    type: number; // 收付类型 0 应收 1 应付
  },
  dataContext: {
    dataSource: any;
    editId: any;
    orderBaseData: any;
  },
) {
  // ==================== 缓存机制 ====================

  const orderDetailCache = new Map<string, any>();
  const orderDetailLoading = new Map<string, Promise<any>>();
  const ctnCodeCache = new Map<number, any>();
  const ctnCodeLoading = new Map<number, Promise<any>>();

  /**
   * 加载订单详情（带缓存）
   */
  async function loadOrderDetailCached(transportOrderId: string) {
    if (orderDetailCache.has(transportOrderId)) {
      console.log('✅ [loadOrderDetailCached] 使用缓存数据:', transportOrderId);
      return orderDetailCache.get(transportOrderId);
    }

    if (orderDetailLoading.has(transportOrderId)) {
      console.log('⏳ [loadOrderDetailCached] 等待已有请求:', transportOrderId);
      return await orderDetailLoading.get(transportOrderId);
    }

    const loadingPromise = getSeaExportDetail(transportOrderId)
      .then((detail) => {
        if (detail) {
          orderDetailCache.set(transportOrderId, detail);
          console.log(
            '✅ [loadOrderDetailCached] 缓存订单详情:',
            transportOrderId,
          );
        }
        orderDetailLoading.delete(transportOrderId);
        return detail;
      })
      .catch((error) => {
        console.error(
          '❌ [loadOrderDetailCached] 加载失败:',
          transportOrderId,
          error,
        );
        orderDetailLoading.delete(transportOrderId);
        throw error;
      });

    orderDetailLoading.set(transportOrderId, loadingPromise);
    return await loadingPromise;
  }

  /**
   * 加载集装箱详情（带缓存）
   */
  async function loadCtnCodeCached(ctnCodeId: number) {
    if (ctnCodeCache.has(ctnCodeId)) {
      return ctnCodeCache.get(ctnCodeId);
    }

    if (ctnCodeLoading.has(ctnCodeId)) {
      return await ctnCodeLoading.get(ctnCodeId);
    }

    const loadingPromise = getCtnCodeDetail(ctnCodeId)
      .then((detail) => {
        if (detail) {
          ctnCodeCache.set(ctnCodeId, detail);
        }
        ctnCodeLoading.delete(ctnCodeId);
        return detail;
      })
      .catch((error) => {
        ctnCodeLoading.delete(ctnCodeId);
        throw error;
      });

    ctnCodeLoading.set(ctnCodeId, loadingPromise);
    return await loadingPromise;
  }

  // ==================== 辅助函数 ====================

  /**
   * 将行业类别字母转换为数字key
   */
  function getCategoryNumber(category: string): number | undefined {
    return getIndustryCategoryOptions().find(
      (item: any) => item.value === category,
    )?.key;
  }

  /**
   * 判断是否为本位币
   */
  async function checkIfIsLocalCurrency(currencyId: number): Promise<boolean> {
    try {
      const transportOrderId = dataContext.editId.value;
      if (!transportOrderId) return false;

      const orderDetail = await loadOrderDetailCached(transportOrderId);

      if (orderDetail?.companys?.length > 0) {
        const company = orderDetail.companys[0];
        const isLocal = company?.localCurrencyId === currencyId;
        console.log(
          '💱 [checkIfLocalCurrency] 币别ID:',
          currencyId,
          '本位币ID:',
          company?.localCurrencyId,
          '是否本位币:',
          isLocal,
        );
        return isLocal;
      }
      return false;
    } catch (error) {
      console.error('❌ [checkIfLocalCurrency] 检查失败:', error);
      return false;
    }
  }

  /**
   * 根据行业类别填充结算对象
   */
  async function fillSettlementIdByIndustryCategory(
    row: any,
    industryCategoryValue: string,
  ) {
    try {
      const transportOrderId = row['transportOrderId'];
      if (!transportOrderId) {
        console.warn(
          '⚠️ [fillSettlementIdByIndustryCategory] transportOrderId 为空',
        );
        return;
      }

      const orderDetail = await loadOrderDetailCached(transportOrderId);
      let settlementId: string | number | undefined;
      let settlementName: string | undefined;

      console.log('🔍 [fillSettlementIdByIndustryCategory] 订单详情:', {
        transportOrder: orderDetail.transportOrder ? '存在' : '不存在',
        yard: orderDetail.yard ? '存在' : '不存在',
        shipAgent: orderDetail.shipAgent ? '存在' : '不存在',
        bookingAgent: orderDetail.bookingAgent ? '存在' : '不存在',
        podAgent: orderDetail.podAgent ? '存在' : '不存在',
      });

      switch (industryCategoryValue.toLowerCase()) {
        case 'b': // 发货人
          settlementId = orderDetail.transportOrder?.shipperId;
          // 从订单详情中获取发货人名称
          if (orderDetail.transportOrder?.shipper) {
            const shipper = orderDetail.transportOrder.shipper as any;
            console.log(
              '📦 [fillSettlementIdByIndustryCategory] 发货人对象:',
              shipper,
            );
            settlementName = `${shipper.fullName || shipper.name}${shipper.code ? ` (${shipper.code})` : ''}`;
          } else {
            console.warn(
              '⚠️ [fillSettlementIdByIndustryCategory] 发货人对象不存在',
            );
          }
          break;
        case 'c': // 场站
          settlementId = orderDetail.yardId;
          if (orderDetail.yard) {
            const yard = orderDetail.yard as any;
            settlementName = `${yard.fullName || yard.name}${yard.code ? ` (${yard.code})` : ''}`;
          }
          break;
        case 'e': // 收货人
          settlementId = orderDetail.transportOrder?.consigneeId;
          if (orderDetail.transportOrder?.consignee) {
            const consignee = orderDetail.transportOrder.consignee as any;
            settlementName = `${consignee.fullName || consignee.name}${consignee.code ? ` (${consignee.code})` : ''}`;
          }
          break;
        case 'f': // 报关行
          settlementId = orderDetail.transportOrder?.custBrokerId;
          if (orderDetail.transportOrder?.custBroker) {
            const custBroker = orderDetail.transportOrder.custBroker as any;
            settlementName = `${custBroker.fullName || custBroker.name}${custBroker.code ? ` (${custBroker.code})` : ''}`;
          }
          break;
        case 'h': // 通知人
          settlementId = orderDetail.transportOrder?.notifierId;
          if (orderDetail.transportOrder?.notifier) {
            const notifier = orderDetail.transportOrder.notifier as any;
            settlementName = `${notifier.fullName || notifier.name}${notifier.code ? ` (${notifier.code})` : ''}`;
          }
          break;
        case 'i': // 车队
          settlementId = orderDetail.transportOrder?.teamId;
          if (orderDetail.transportOrder?.team) {
            const team = orderDetail.transportOrder.team as any;
            settlementName = `${team.fullName || team.name}${team.code ? ` (${team.code})` : ''}`;
          }
          break;
        case 'n': // 船代
          settlementId = orderDetail.shipAgentId;
          if (orderDetail.shipAgent) {
            const shipAgent = orderDetail.shipAgent as any;
            settlementName = `${shipAgent.fullName || shipAgent.name}${shipAgent.code ? ` (${shipAgent.code})` : ''}`;
          }
          break;
        case 'o': // 订舱代理
          settlementId = orderDetail.bookingAgentId;
          if (orderDetail.bookingAgent) {
            const bookingAgent = orderDetail.bookingAgent as any;
            settlementName = `${bookingAgent.fullName || bookingAgent.name}${bookingAgent.code ? ` (${bookingAgent.code})` : ''}`;
          }
          break;
        case 'p': // 委托单位
          settlementId = orderDetail.transportOrder?.clientId;
          if (orderDetail.transportOrder?.client) {
            const client = orderDetail.transportOrder.client as any;
            settlementName = `${client.fullName || client.name}${client.code ? ` (${client.code})` : ''}`;
          }
          break;
        case 'q': // 仓库
          settlementId = orderDetail.transportOrder?.warehouseId;
          if (orderDetail.transportOrder?.warehouse) {
            const warehouse = orderDetail.transportOrder.warehouse as any;
            settlementName = `${warehouse.fullName || warehouse.name}${warehouse.code ? ` (${warehouse.code})` : ''}`;
          }
          break;
        case 'r': // 保险公司
          settlementId = orderDetail.transportOrder?.insuranceId;
          if (orderDetail.transportOrder?.insurance) {
            const insurance = orderDetail.transportOrder.insurance as any;
            settlementName = `${insurance.fullName || insurance.name}${insurance.code ? ` (${insurance.code})` : ''}`;
          }
          break;
        case 's': // 国外代理
          settlementId = orderDetail.podAgentId;
          if (orderDetail.podAgent) {
            const podAgent = orderDetail.podAgent as any;
            settlementName = `${podAgent.fullName || podAgent.name}${podAgent.code ? ` (${podAgent.code})` : ''}`;
          }
          break;
      }

      if (settlementId !== undefined && settlementId !== null) {
        row['settlementId'] = String(settlementId);

        // ✅ 缓存客户名称到 __settlementName 字段
        if (settlementName) {
          // 使用 Vue.set 或直接赋值确保响应式更新
          row['__settlementName'] = settlementName;

          console.log(
            '👤 [fillSettlementIdByIndustryCategory] 行业类别:',
            industryCategoryValue,
            '结算对象ID:',
            settlementId,
            '名称:',
            settlementName,
          );
        } else {
          console.warn(
            '⚠️ [fillSettlementIdByIndustryCategory] 未找到对应的结算对象名称，尝试从其他来源获取:',
            industryCategoryValue,
            'settlementId:',
            settlementId,
          );

          // 备用方案：尝试从 transportOrder 的其他字段获取名称
          const transportOrder = orderDetail.transportOrder;
          let fallbackName: string | undefined;

          switch (industryCategoryValue.toLowerCase()) {
            case 'b': // 发货人
              fallbackName =
                transportOrder?.shipperName || transportOrder?.shipperContent;
              break;
            case 'c': // 场站
              fallbackName = orderDetail.yardName;
              break;
            case 'e': // 收货人
              fallbackName =
                transportOrder?.consigneeName ||
                transportOrder?.consigneeContent;
              break;
            case 'f': // 报关行
              fallbackName = transportOrder?.custBrokerName;
              break;
            case 'h': // 通知人
              fallbackName =
                transportOrder?.notifierName || transportOrder?.notifierContent;
              break;
            case 'i': // 车队
              fallbackName = transportOrder?.teamName;
              break;
            case 'p': // 委托单位
              fallbackName = transportOrder?.clientName;
              break;
            case 'q': // 仓库
              fallbackName = transportOrder?.warehouseName;
              break;
            case 'r': // 保险公司
              fallbackName = transportOrder?.insuranceName;
              break;
          }

          if (fallbackName) {
            // 如果是 JSON 字符串，尝试解析
            try {
              if (
                typeof fallbackName === 'string' &&
                fallbackName.startsWith('{')
              ) {
                const parsed = JSON.parse(fallbackName);
                fallbackName =
                  parsed.name ||
                  parsed.cnName ||
                  parsed.fullName ||
                  fallbackName;
              }
            } catch (e) {
              // 解析失败，使用原始值
            }

            row['__settlementName'] = String(fallbackName);
            console.log(
              '✅ [fillSettlementIdByIndustryCategory] 使用备用名称:',
              fallbackName,
            );
          } else {
            console.warn(
              '❌ [fillSettlementIdByIndustryCategory] 无法获取结算对象名称',
            );
          }
        }
      } else {
        console.warn(
          '⚠️ [fillSettlementIdByIndustryCategory] 未找到对应的结算对象:',
          industryCategoryValue,
        );
      }
    } catch (error) {
      console.error('❌ [fillSettlementIdByIndustryCategory] 填充失败:', error);
    }
  }

  /**
   * 填充箱型数量
   */
  async function fillCtnQuantity(row: any) {
    try {
      const transportOrderId = row['transportOrderId'];
      if (!transportOrderId) return;

      const orderDetail = await loadOrderDetailCached(transportOrderId);
      const ctns = orderDetail.transportOrder?.orderCtns || [];

      if (ctns.length === 0) {
        console.log('📦 [fillCtnQuantity] 无箱型数据，设置单位为票，数量为1');
        row['unit'] = '票';
        row['quantity'] = 1;
        return;
      }

      // 填充第一个箱型的名称作为单位
      const firstCtnName = ctns[0]?.ctnCodeName || '';
      row['unit'] = firstCtnName;

      // 计算相同箱型的数量
      const sameCtnCount = ctns.filter(
        (ctn: any) => ctn.ctnCodeName === firstCtnName,
      ).length;

      row['quantity'] = sameCtnCount;
      console.log(
        '📦 [fillCtnQuantity] 箱型:',
        firstCtnName,
        '数量:',
        sameCtnCount,
      );
    } catch (error) {
      console.error('❌ [fillCtnQuantity] 填充失败:', error);
    }
  }

  /**
   * 填充订单数量（毛重、尺码、件数、TEU）
   */
  async function fillOrderQuantity(row: any, unitName: string) {
    try {
      const transportOrderId = row['transportOrderId'];
      if (!transportOrderId) return;

      const orderDetail = await loadOrderDetailCached(transportOrderId);
      const transportOrder = orderDetail.transportOrder;

      switch (unitName.toLowerCase()) {
        case '毛重':
        case 'kgs':
          row['quantity'] = transportOrder.kgs || 0;
          console.log('⚖️ [fillOrderQuantity] 毛重:', row['quantity']);
          break;
        case '尺码':
        case 'cbm':
          row['quantity'] = transportOrder.cbm || 0;
          console.log('📐 [fillOrderQuantity] 尺码:', row['quantity']);
          break;
        case '件数':
        case 'pkgs':
          row['quantity'] = transportOrder.pkgs || 0;
          console.log('📦 [fillOrderQuantity] 件数:', row['quantity']);
          break;
        case 'teu':
          // 累加所有箱型的TEU值
          let totalTeu = 0;
          for (const ctn of transportOrder.orderCtns || []) {
            const ctnDetail = await loadCtnCodeCached(ctn.ctnCodeId);
            if (ctnDetail?.teu !== undefined) {
              totalTeu += ctnDetail.teu;
            }
          }
          row['quantity'] = totalTeu;
          console.log('🚢 [fillOrderQuantity] TEU:', totalTeu);
          break;
      }
    } catch (error) {
      console.error('❌ [fillOrderQuantity] 填充失败:', error);
    }
  }

  /**
   * 根据单位类型填充数量
   */
  async function fillQuantityByUnit(row: any, unitName: string) {
    const unitNameLower = unitName.toLowerCase();

    if (unitNameLower === '票' || unitNameLower === 'order') {
      row['quantity'] = 1;
      console.log('🎫 [fillQuantityByUnit] 票/ORDER，数量设为1');
    } else if (unitNameLower === '毛重' || unitNameLower === 'kgs') {
      await fillOrderQuantity(row, unitName);
    } else if (unitNameLower === '尺码' || unitNameLower === 'cbm') {
      await fillOrderQuantity(row, unitName);
    } else if (unitNameLower === '件数' || unitNameLower === 'pkgs') {
      await fillOrderQuantity(row, unitName);
    } else if (unitNameLower === 'teu') {
      await fillOrderQuantity(row, unitName);
    } else {
      // 箱型：统计该箱型的数量
      await fillCtnQuantity(row);
    }
  }

  // ==================== 字段联动处理函数 ====================

  /**
   * 处理费用代码变化
   */
  async function handleFeeCodeChange(
    rowIndex: number,
    feeCodeId: any,
    hotInstance: any,
  ) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row || !feeCodeId) return;

      console.log('🔵 [handleFeeCodeChange] 费用代码变化:', feeCodeId);

      // 获取费用代码详情
      const feeCodeDetail = await getFeeCodeDetail(feeCodeId);
      if (!feeCodeDetail) {
        console.warn('⚠️ [handleFeeCodeChange] 未获取到费用代码详情');
        return;
      }

      console.log('✅ [handleFeeCodeDetail] 费用代码详情:', feeCodeDetail);

      // 根据收付类型自动填充行业类别和结算对象
      const paySide = props.type;
      if (paySide === 0) {
        // 应收：使用 defaultDebitName（收费客户类型）
        const debitCategory = feeCodeDetail.defaultDebitName;
        if (debitCategory) {
          // ✅ 修正：将字母代码转换为数值ID后赋值给 industryCategory
          const option = getIndustryCategoryOptions().find(
            (opt) => opt.value === debitCategory,
          );
          const categoryKey = option?.key;

          if (categoryKey) {
            row['industryCategory'] = categoryKey;
            console.log(
              '📋 [handleFeeCodeChange] 应收-行业类别:',
              debitCategory,
              '(字母代码) →',
              categoryKey,
              '(数值ID)',
            );
            await fillSettlementIdByIndustryCategory(row, debitCategory);
          } else {
            console.warn(
              '⚠️ [handleFeeCodeChange] 未找到字母代码对应的数值ID:',
              debitCategory,
            );
          }
        }
      } else if (paySide === 1) {
        // 应付：使用 defaultCreditName（付费客户类型）
        const creditCategory = feeCodeDetail.defaultCreditName;
        if (creditCategory) {
          // ✅ 修正：将字母代码转换为数值ID后赋值给 industryCategory
          const option = getIndustryCategoryOptions().find(
            (opt) => opt.value === creditCategory,
          );
          const categoryKey = option?.key;

          if (categoryKey) {
            row['industryCategory'] = categoryKey;
            console.log(
              '📋 [handleFeeCodeChange] 应付-行业类别:',
              creditCategory,
              '(字母代码) →',
              categoryKey,
              '(数值ID)',
            );
            await fillSettlementIdByIndustryCategory(row, creditCategory);
          } else {
            console.warn(
              '⚠️ [handleFeeCodeChange] 未找到字母代码对应的数值ID:',
              creditCategory,
            );
          }
        }
      }

      // 自动填充币别
      if (feeCodeDetail.currencyId) {
        row['currencyId'] = feeCodeDetail.currencyId;
        console.log(
          '💰 [handleFeeCodeChange] 设置币别ID:',
          feeCodeDetail.currencyId,
          '类型:',
          typeof feeCodeDetail.currencyId,
        );

        // 判断是否为本位币并设置汇率
        const currencyIdNum =
          typeof feeCodeDetail.currencyId === 'number'
            ? feeCodeDetail.currencyId
            : Number(feeCodeDetail.currencyId);
        const isLocalCurrency = await checkIfIsLocalCurrency(currencyIdNum);
        if (isLocalCurrency) {
          row['exchangeRate'] = 1;
          row['__isLocalCurrency'] = true;
          row['__editing_exchangeRate'] = false;
          console.log('💱 [handleFeeCodeChange] 本位币，汇率设为1');
        } else {
          // 获取汇率详情
          const exchangeRateData = await getExchangeRateDetail(
            feeCodeDetail.currencyId,
          );
          if (exchangeRateData) {
            row['exchangeRate'] = props.type
              ? exchangeRateData.drValue // 应付用drValue
              : exchangeRateData.crValue; // 应收用crValue
            row['__isLocalCurrency'] = false;
            console.log(
              '💱 [handleFeeCodeChange] 非本位币，汇率:',
              row['exchangeRate'],
            );
          }
        }
      }

      // 自动填充税率
      if (feeCodeDetail.taxRate !== undefined) {
        row['taxRate'] = feeCodeDetail.taxRate;
        console.log('📊 [handleFeeCodeChange] 税率:', feeCodeDetail.taxRate);
      }

      // 自动填充单位和数量
      const defaultUnitName = feeCodeDetail.defaultUnitName;
      if (defaultUnitName) {
        row['unit'] = defaultUnitName;
        console.log('📏 [handleFeeCodeChange] 单位:', defaultUnitName);

        // 根据单位类型填充数量
        if (defaultUnitName === '箱型' || defaultUnitName === 'CTN') {
          await fillCtnQuantity(row);
        } else if (defaultUnitName === '票' || defaultUnitName === 'ORDER') {
          row['quantity'] = 1;
          console.log('🎫 [handleFeeCodeChange] 票/ORDER，数量设为1');
        } else if (['毛重', '尺码', '件数', 'TEU'].includes(defaultUnitName)) {
          await fillOrderQuantity(row, defaultUnitName);
        }
      }

      // ✅ 强制刷新表格，确保 __settlementName 的更新被正确渲染
      if (hotInstance) {
        // 在刷新前检查数据
        const currentRow = dataContext.dataSource.value[rowIndex];
        console.log('🔍 [handleFeeCodeChange] 刷新前检查行数据:', {
          rowIndex,
          settlementId: currentRow?.settlementId,
          settlementName: (currentRow as any)?.__settlementName,
          currencyId: currentRow?.currencyId,
        });

        // 使用 loadData 重新加载数据以确保响应式更新
        hotInstance.loadData(dataContext.dataSource.value);
        console.log('🔄 [handleFeeCodeChange] 已刷新表格数据');
      }

      console.log('✅ [handleFeeCodeChange] 联动完成');
    } catch (error) {
      console.error('❌ [handleFeeCodeChange] 处理失败:', error);
    }
  }

  /**
   * 处理行业类别变化
   */
  async function handleIndustryCategoryChange(
    rowIndex: number,
    industryCategory: any,
    hotInstance: any,
  ) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row || !industryCategory) return;

      console.log(
        '🔵 [handleIndustryCategoryChange] 行业类别变化:',
        industryCategory,
      );

      // ✅ 修正：industryCategory 现在是数值ID，需要转换为字母代码用于联动
      let industryCategoryCode: string | undefined;

      if (typeof industryCategory === 'number') {
        // 通过数值ID查找对应的字母代码
        const option = getIndustryCategoryOptions().find(
          (opt) => opt.key === industryCategory,
        );
        industryCategoryCode = option?.value;
      } else if (typeof industryCategory === 'string') {
        // 如果已经是字母代码，直接使用
        industryCategoryCode = industryCategory;
      }

      if (industryCategoryCode) {
        console.log(
          '🔵 [handleIndustryCategoryChange] 使用字母代码进行联动:',
          industryCategoryCode,
        );
        await fillSettlementIdByIndustryCategory(row, industryCategoryCode);

        // ✅ 强制刷新表格，确保 __settlementName 的更新被正确渲染
        if (hotInstance) {
          // 使用 loadData 重新加载数据以确保响应式更新
          hotInstance.loadData(dataContext.dataSource.value);
          console.log('🔄 [handleIndustryCategoryChange] 已刷新表格数据');
        }

        console.log('✅ [handleIndustryCategoryChange] 联动完成');
      } else {
        console.warn(
          '⚠️ [handleIndustryCategoryChange] 无法获取字母代码:',
          industryCategory,
        );
      }
    } catch (error) {
      console.error('❌ [handleIndustryCategoryChange] 处理失败:', error);
    }
  }

  /**
   * 处理币别变化
   */
  async function handleCurrencyChange(
    rowIndex: number,
    currencyId: any,
    hotInstance: any,
  ) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row) return;

      console.log('🔵 [handleCurrencyChange] 币别变化:', currencyId);

      if (currencyId) {
        // 获取汇率详情
        const exchangeRateData = await getExchangeRateDetail(currencyId);

        // 判断是否为本位币
        const isLocalCurrency = await checkIfIsLocalCurrency(currencyId);

        if (isLocalCurrency) {
          row['exchangeRate'] = 1;
          row['__isLocalCurrency'] = true;
          row['__editing_exchangeRate'] = false;
          console.log('💱 [handleCurrencyChange] 本位币，汇率设为1');
        } else {
          if (exchangeRateData) {
            row['exchangeRate'] = props.type
              ? exchangeRateData.drValue
              : exchangeRateData.crValue;
            row['__isLocalCurrency'] = false;
            console.log(
              '💱 [handleCurrencyChange] 非本位币，汇率:',
              row['exchangeRate'],
            );
          }
        }
      } else {
        // 清空币别时同时清空汇率
        row['exchangeRate'] = undefined;
        row['__isLocalCurrency'] = false;
        console.log('💱 [handleCurrencyChange] 清空币别和汇率');
      }

      // 刷新表格显示
      if (hotInstance) {
        hotInstance.render();
      }

      console.log('✅ [handleCurrencyChange] 联动完成');
    } catch (error) {
      console.error('❌ [handleCurrencyChange] 处理失败:', error);
    }
  }

  /**
   * 处理单位变化
   */
  async function handleUnitChange(
    rowIndex: number,
    unitName: any,
    hotInstance: any,
  ) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row || !unitName) return;

      console.log('🔵 [handleUnitChange] 单位变化:', unitName);

      await fillQuantityByUnit(row, unitName);

      // 刷新表格显示
      if (hotInstance) {
        hotInstance.render();
      }

      console.log('✅ [handleUnitChange] 联动完成');
    } catch (error) {
      console.error('❌ [handleUnitChange] 处理失败:', error);
    }
  }

  /**
   * 处理含税单价变化
   */
  function handleUnitPriceChange(
    rowIndex: number,
    unitPrice: any,
    hotInstance: any,
  ) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row || unitPrice === '' || unitPrice === undefined) return;

      console.log('🔵 [handleUnitPriceChange] 含税单价变化:', unitPrice);

      const priceValue = Number(unitPrice);

      // 计算含税金额 = 单价 × 数量
      if (row['quantity']) {
        row['amount'] = Number((priceValue * row['quantity']).toFixed(2));
        console.log('💰 [handleUnitPriceChange] 含税金额:', row['amount']);
      }

      // 如果存在税率，计算不含税单价和金额
      if (row['taxRate'] !== undefined && row['taxRate'] !== null) {
        const taxRate = Number(row['taxRate']);
        // 不含税单价 = 含税单价 / (1 + 税率/100)
        const noTaxUnitPrice = priceValue / (1 + taxRate / 100);
        row['noTaxUnitPrice'] = Number(noTaxUnitPrice.toFixed(4));

        if (row['quantity']) {
          // 不含税金额 = 不含税单价 × 数量
          row['noTaxAmount'] = Number(
            (noTaxUnitPrice * row['quantity']).toFixed(2),
          );
          console.log(
            '💰 [handleUnitPriceChange] 不含税单价:',
            row['noTaxUnitPrice'],
            '不含税金额:',
            row['noTaxAmount'],
          );
        }
      }

      // 刷新表格显示
      if (hotInstance) {
        hotInstance.render();
      }

      console.log('✅ [handleUnitPriceChange] 计算完成');
    } catch (error) {
      console.error('❌ [handleUnitPriceChange] 处理失败:', error);
    }
  }

  /**
   * 处理数量变化
   */
  function handleQuantityChange(
    rowIndex: number,
    quantity: any,
    hotInstance: any,
  ) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row || quantity === '' || quantity === undefined) return;

      console.log('🔵 [handleQuantityChange] 数量变化:', quantity);

      const qtyValue = Number(quantity);

      // 计算含税金额 = 单价 × 数量
      if (row['unitPrice']) {
        row['amount'] = Number((qtyValue * row['unitPrice']).toFixed(2));
        console.log('💰 [handleQuantityChange] 含税金额:', row['amount']);
      }

      // 如果存在税率，计算不含税金额
      if (
        row['unitPrice'] &&
        row['taxRate'] !== undefined &&
        row['taxRate'] !== null
      ) {
        const taxRate = Number(row['taxRate']);
        const noTaxUnitPrice = row['unitPrice'] / (1 + taxRate / 100);
        row['noTaxAmount'] = Number((noTaxUnitPrice * qtyValue).toFixed(2));
        console.log(
          '💰 [handleQuantityChange] 不含税金额:',
          row['noTaxAmount'],
        );
      }

      // 刷新表格显示
      if (hotInstance) {
        hotInstance.render();
      }

      console.log('✅ [handleQuantityChange] 计算完成');
    } catch (error) {
      console.error('❌ [handleQuantityChange] 处理失败:', error);
    }
  }

  /**
   * 处理税率变化
   */
  function handleTaxRateChange(
    rowIndex: number,
    taxRate: any,
    hotInstance: any,
  ) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row || taxRate === '' || taxRate === undefined) return;

      console.log('🔵 [handleTaxRateChange] 税率变化:', taxRate);

      const rateValue = Number(taxRate);

      if (row['unitPrice']) {
        // 重新计算不含税单价
        const noTaxUnitPrice = row['unitPrice'] / (1 + rateValue / 100);
        row['noTaxUnitPrice'] = Number(noTaxUnitPrice.toFixed(4));

        // 重新计算不含税金额
        if (row['quantity']) {
          row['noTaxAmount'] = Number(
            (noTaxUnitPrice * row['quantity']).toFixed(2),
          );
          console.log(
            '💰 [handleTaxRateChange] 不含税单价:',
            row['noTaxUnitPrice'],
            '不含税金额:',
            row['noTaxAmount'],
          );
        }
      }

      // 刷新表格显示
      if (hotInstance) {
        hotInstance.render();
      }

      console.log('✅ [handleTaxRateChange] 计算完成');
    } catch (error) {
      console.error('❌ [handleTaxRateChange] 处理失败:', error);
    }
  }

  /**
   * 处理含税金额变化（反向计算）
   */
  function handleAmountChange(rowIndex: number, amount: any, hotInstance: any) {
    try {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row || amount === '' || amount === undefined) return;

      console.log('🔵 [handleAmountChange] 含税金额变化:', amount);

      const amountValue = Number(amount);
      const quantity = row['quantity'];
      const taxRate = row['taxRate'];

      if (quantity && quantity !== 0) {
        // 1. 计算含税单价 = 含税金额 / 数量
        row['unitPrice'] = Number((amountValue / quantity).toFixed(4));
        console.log('💰 [handleAmountChange] 含税单价:', row['unitPrice']);

        // 2. 如果存在税率，计算不含税单价和金额
        if (taxRate !== undefined && taxRate !== null) {
          const unitPrice = amountValue / quantity;
          const noTaxUnitPrice = unitPrice / (1 + taxRate / 100);
          row['noTaxUnitPrice'] = Number(noTaxUnitPrice.toFixed(4));
          row['noTaxAmount'] = Number((noTaxUnitPrice * quantity).toFixed(2));
          console.log(
            '💰 [handleAmountChange] 不含税单价:',
            row['noTaxUnitPrice'],
            '不含税金额:',
            row['noTaxAmount'],
          );
        }
      }

      // 刷新表格显示
      if (hotInstance) {
        hotInstance.render();
      }

      console.log('✅ [handleAmountChange] 计算完成');
    } catch (error) {
      console.error('❌ [handleAmountChange] 处理失败:', error);
    }
  }

  /**
   * 统一的 afterChange 处理器
   */
  function handleAfterChange(changes: any, source: string, hotInstance: any) {
    if (source === 'loadData' || !changes) return;

    console.log('🔄 [handleAfterChange] 数据变化:', changes);

    // 处理数据变化时的联动逻辑
    changes.forEach(([rowIndex, prop, oldValue, newValue]: any[]) => {
      // 费用代码变化
      if (prop === 'feeCodeId') {
        handleFeeCodeChange(rowIndex, newValue, hotInstance);
      }
      // 行业类别变化
      else if (prop === 'industryCategory') {
        handleIndustryCategoryChange(rowIndex, newValue, hotInstance);
      }
      // 币别变化
      else if (prop === 'currencyId') {
        handleCurrencyChange(rowIndex, newValue, hotInstance);
      }
      // 单位变化
      else if (prop === 'unit') {
        handleUnitChange(rowIndex, newValue, hotInstance);
      }
      // 含税单价变化
      else if (prop === 'unitPrice') {
        handleUnitPriceChange(rowIndex, newValue, hotInstance);
      }
      // 数量变化
      else if (prop === 'quantity') {
        handleQuantityChange(rowIndex, newValue, hotInstance);
      }
      // 税率变化
      else if (prop === 'taxRate') {
        handleTaxRateChange(rowIndex, newValue, hotInstance);
      }
      // 含税金额变化
      else if (prop === 'amount') {
        handleAmountChange(rowIndex, newValue, hotInstance);
      }
    });
  }

  return {
    handleAfterChange,
    // 导出所有联动处理函数供外部使用
    handleFeeCodeChange,
    handleIndustryCategoryChange,
    handleCurrencyChange,
    handleUnitChange,
    handleUnitPriceChange,
    handleQuantityChange,
    handleTaxRateChange,
    handleAmountChange,
    // 导出辅助函数供外部使用
    checkIfIsLocalCurrency,
    fillSettlementIdByIndustryCategory,
    fillQuantityByUnit,
  };
}
