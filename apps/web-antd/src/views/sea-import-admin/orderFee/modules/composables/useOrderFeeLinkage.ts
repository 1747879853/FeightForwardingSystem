import type { OrderFeeAdminApi } from '#/api/sea-import/order-fee-admin';
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';
import { getCtnCodeDetail } from '#/api/system/base-data/ctn-code-admin';
import { getSeaImportDetail } from '#/api/sea-import/sea-import-admin';
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
  getDropdownSources: () => {
    industryCategoryList: Array<{ label: string; value: any }>;
    currencyList: Array<{ label: string; value: any }>;
    feeCodeDetailCache?: Map<string, any>; // ✅ 新增：费用代码详情缓存
    exchangeRateCache?: Map<string, any>; // ✅ 新增：汇率缓存
    getExchangeRateFromCache?: (
      currencyId: any,
      paySide: number,
    ) => number | undefined; // ✅ 新增：从缓存获取汇率的方法
    allClientsByIndustry?: Record<
      string,
      Array<{
        label: string;
        value: any;
        name?: string;
        code?: string;
        id?: any;
      }>
    >; // ✅ 新增：全量客户缓存
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

    // ✅ 修复：使用海运进口的 API
    const loadingPromise = getSeaImportDetail(transportOrderId)
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
   * 更新订单详情缓存（用于 watch 监听外部传入的 orderDetail 变化）
   */
  function updateOrderDetailCache(transportOrderId: string, detail: any) {
    if (transportOrderId && detail) {
      orderDetailCache.set(transportOrderId, detail);
      // 清除可能存在的加载状态
      orderDetailLoading.delete(transportOrderId);
      console.log(
        '✅ [updateOrderDetailCache] 更新订单详情缓存:',
        transportOrderId,
      );
    }
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
   * 检查币别是否为本位币
   */
  async function checkIfIsLocalCurrency(currencyId: number): Promise<boolean> {
    try {
      const transportOrderId = dataContext.editId.value;
      if (!transportOrderId) return false;

      const orderDetail = await loadOrderDetailCached(transportOrderId);

      const companyNode = orderDetail?.orgs?.find(
        (node: any) =>
          node?.localCurrencyId !== null && node?.localCurrencyId !== undefined,
      );
      if (companyNode) {
        const isLocal = companyNode.localCurrencyId === currencyId;
        console.log(
          '💱 [checkIfIsLocalCurrency] 币别ID:',
          currencyId,
          '本位币ID:',
          companyNode.localCurrencyId,
          '是否本位币:',
          isLocal,
        );
        return isLocal;
      }
      return false;
    } catch (error) {
      console.error('❌ [checkIfIsLocalCurrency] 检查失败:', error);
      return false;
    }
  }

  /**
   * ✅ 新增：从汇率缓存中获取汇率（封装方法）
   * @param currencyId 币别ID
   * @param paySide 收付类型：0-应收（使用crValue），1-应付（使用drValue）
   * @returns 汇率值，如果未找到则返回 undefined
   */
  function getExchangeRateFromCache(
    currencyId: any,
    paySide: number,
  ): number | undefined {
    try {
      const sources = getDropdownSources();

      // 优先使用 sources 中的 getExchangeRateFromCache 方法
      if (sources.getExchangeRateFromCache) {
        return sources.getExchangeRateFromCache(currencyId, paySide);
      }

      // 降级：直接从 exchangeRateCache 中获取
      const exchangeRateCache = sources.exchangeRateCache;
      if (!exchangeRateCache || !currencyId) {
        console.warn('⚠️ [getExchangeRateFromCache] 汇率缓存不存在');
        return undefined;
      }

      const currencyIdStr = String(currencyId);
      const rate = exchangeRateCache.get(currencyIdStr);

      if (!rate) {
        console.warn(
          '⚠️ [getExchangeRateFromCache] 未找到币别',
          currencyId,
          '的汇率缓存',
        );
        return undefined;
      }

      // 根据收付类型选择应收或应付汇率
      // 注意：paySide === 0 是应收，应该用 crValue
      // paySide === 1 是应付，应该用 drValue
      const rateValue = paySide === 1 ? rate.drValue : rate.crValue;

      if (rateValue === undefined || rateValue === null) {
        console.warn(
          '⚠️ [getExchangeRateFromCache] 币别',
          currencyId,
          '的汇率值为空',
        );
        return undefined;
      }

      console.log(
        '💱 [getExchangeRateFromCache] 从缓存获取汇率 - 币别:',
        rate.currencyCode || currencyId,
        '收付类型:',
        paySide === 1 ? '应付(drValue)' : '应收(crValue)',
        '汇率:',
        rateValue,
      );

      return rateValue;
    } catch (error) {
      console.error('❌ [getExchangeRateFromCache] 获取失败:', error);
      return undefined;
    }
  }

  /**
   * ✅ 重构：从费用代码缓存中获取汇率信息，避免重复调用接口
   * @param feeCodeId 费用代码ID
   * @param currencyId 币别ID
   * @returns 汇率值，如果未找到则返回 undefined
   */
  function getExchangeRateFromFeeCodeCache(
    feeCodeId: any,
    currencyId: any,
  ): number | undefined {
    try {
      const sources = getDropdownSources();
      const feeCodeCache = sources.feeCodeDetailCache;

      if (!feeCodeCache || !feeCodeId) {
        console.warn('⚠️ [getExchangeRateFromFeeCodeCache] 费用代码缓存不存在');
        return undefined;
      }

      const feeCodeIdStr = String(feeCodeId);
      const feeCodeDetail = feeCodeCache.get(feeCodeIdStr);

      if (!feeCodeDetail) {
        console.warn(
          '⚠️ [getExchangeRateFromFeeCodeCache] 未找到费用代码详情:',
          feeCodeId,
        );
        return undefined;
      }

      // ✅ 关键优化：直接从费用代码缓存中获取汇率信息
      const exchangeRate = feeCodeDetail.exchangeRate;

      if (!exchangeRate) {
        console.warn(
          '⚠️ [getExchangeRateFromFeeCodeCache] 费用代码无汇率信息:',
          feeCodeId,
        );
        return undefined;
      }

      // 根据收付类型选择应收或应付汇率
      const rateValue =
        props.type === 1 ? exchangeRate.drValue : exchangeRate.crValue;

      console.log(
        '💱 [getExchangeRateFromFeeCodeCache] 从缓存获取汇率 - 费用代码:',
        feeCodeId,
        '币别:',
        currencyId,
        '汇率:',
        rateValue,
      );

      return rateValue ?? undefined;
    } catch (error) {
      console.error('❌ [getExchangeRateFromFeeCodeCache] 获取失败:', error);
      return undefined;
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

      console.log(
        '🔍 [fillSettlementIdByIndustryCategory] 订单详情:',
        {
          transportOrder: orderDetail.transportOrder ? '存在' : '不存在',
          yard: orderDetail.yard ? '存在' : '不存在',
          shipAgent: orderDetail.shipAgent ? '存在' : '不存在',
          bookingAgent: orderDetail.bookingAgent ? '存在' : '不存在',
          podAgent: orderDetail.podAgent ? '存在' : '不存在',
        },
        orderDetail,
      );

      switch (industryCategoryValue.toLowerCase()) {
        case 'b': // 发货人
          settlementId = orderDetail.transportOrder?.shipperId;
          // 从订单详情中获取发货人名称
          settlementName = orderDetail.transportOrder?.shipper?.name || '';
          break;
        case 'c': // 场站
          settlementId = orderDetail.yardId;
          settlementName = orderDetail.yard?.name || '';

          break;
        case 'e': // 收货人
          settlementId = orderDetail.transportOrder?.consigneeId;
          settlementName = orderDetail.transportOrder?.consignee?.name || '';
          break;
        case 'f': // 报关行
          settlementId = orderDetail.transportOrder?.custBrokerId;
          settlementName = orderDetail.transportOrder?.custBroker?.name || '';
          break;
        case 'h': // 通知人
          settlementId = orderDetail.transportOrder?.notifierId;
          settlementName = orderDetail.transportOrder?.notifier?.name || '';
          break;
        case 'i': // 车队
          settlementId = orderDetail.transportOrder?.teamId;
          settlementName = orderDetail.transportOrder?.team?.name || '';
          break;
        case 'n': // 船代
          settlementId = orderDetail.shipAgentId;
          settlementName = orderDetail.shipAgent?.name || '';
          break;
        case 'o': // 订舱代理
          settlementId = orderDetail.bookingAgentId;
          settlementName = orderDetail.bookingAgent?.name || '';
          break;
        case 'p': // 委托单位
          settlementId = orderDetail.transportOrder?.clientId;
          settlementName = orderDetail.transportOrder?.client?.name || '';
          break;
        case 'q': // 仓库
          settlementId = orderDetail.transportOrder?.warehouseId;
          settlementName = orderDetail.transportOrder?.warehouse?.name || '';
          break;
        case 'r': // 保险公司
          settlementId = orderDetail.transportOrder?.insuranceId;
          settlementName = orderDetail.transportOrder?.insurance?.name || '';
          break;
        case 's': // 国外代理
          settlementId = orderDetail.podAgentId;
          settlementName = orderDetail.podAgent?.name || '';
          break;
      }

      if (settlementId !== undefined && settlementId !== null) {
        // ✅ 缓存客户名称到 __settlementName 字段
        if (settlementName) {
          // 主字段存储 label（客户名称，用于显示）
          row['settlementId'] = settlementName;
          // _value 字段存储 ID（用于联动和保存）
          row['settlementId_value'] = settlementId;
          // __settlementName 也缓存一份（兼容旧代码）
          row['settlementName'] = settlementName;

          console.log(
            '👤 [fillSettlementIdByIndustryCategory] 行业类别:',
            industryCategoryValue,
            '结算对象ID:',
            settlementId,
            '名称:',
            settlementName,
          );
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
      const ctns = orderDetail.orderCtns || [];

      if (ctns.length === 0) {
        console.log('📦 [fillCtnQuantity] 无箱型数据，设置单位为票，数量为1');
        row['unit'] = '票';
        row['quantity'] = 1;
        return;
      }

      // 填充第一个箱型的名称作为单位
      const firstCtnName = ctns[0]?.ctnCode.ctnName || '';
      row['unit'] = firstCtnName;

      // 计算相同箱型的数量
      const sameCtnCount = ctns.filter(
        (ctn: any) => ctn.ctnCode.ctnName === firstCtnName,
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
   * ✅ 重构：处理费用代码变化 - 使用缓存而非API调用
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

      // ✅ 同步设置 _value 字段
      row['feeCodeId_value'] = feeCodeId;

      // ✅ 关键优化：从缓存中获取费用代码详情，而非调用API
      const sources = getDropdownSources();

      // 🔍 调试日志：检查 sources 对象
      console.log('🔍 [handleFeeCodeChange] sources 对象:', {
        hasIndustryCategoryList: !!sources.industryCategoryList,
        industryCategoryListLength: sources.industryCategoryList?.length || 0,
        hasCurrencyList: !!sources.currencyList,
        currencyListLength: sources.currencyList?.length || 0,
        hasFeeCodeDetailCache: !!sources.feeCodeDetailCache,
        feeCodeDetailCacheSize: sources.feeCodeDetailCache?.size || 0,
        feeCodeDetailCacheType: typeof sources.feeCodeDetailCache,
      });

      const feeCodeCache = sources.feeCodeDetailCache;

      if (!feeCodeCache) {
        console.error('❌ [handleFeeCodeChange] 费用代码缓存不存在！');
        console.error('💡 请检查父组件是否正确传递了 feeCodeDetailCache');
        return;
      }

      const feeCodeIdStr = String(feeCodeId);
      const feeCodeDetail = feeCodeCache.get(feeCodeIdStr);

      if (!feeCodeDetail) {
        console.warn('⚠️ [handleFeeCodeChange] 未找到费用代码详情:', feeCodeId);
        console.warn('💡 缓存中的所有键:', Array.from(feeCodeCache.keys()));
        return;
      }

      console.log('✅ [handleFeeCodeChange] 从缓存获取费用代码详情成功');
      console.log('📋 [handleFeeCodeChange] 费用代码详情:', {
        id: feeCodeDetail.id,
        code: feeCodeDetail.code,
        cnName: feeCodeDetail.cnName,
        currencyId: feeCodeDetail.currencyId,
        defaultUnitName: feeCodeDetail.defaultUnitName,
        taxRate: feeCodeDetail.taxRate,
        hasExchangeRate: !!feeCodeDetail.exchangeRate,
      });

      // 根据收付类型自动填充行业类别和结算对象
      const paySide = props.type;
      if (paySide === 0) {
        // 应收：使用 defaultDebitName（收费客户类型）
        const debitCategory = feeCodeDetail.defaultDebitName;
        if (debitCategory) {
          // ✅ 修正：将字母代码转换为数值ID
          const option = getIndustryCategoryOptions().find(
            (opt) => opt.value === debitCategory,
          );
          const categoryKey = option?.key;

          if (categoryKey) {
            // ✅ 从 dropdownSources 中查找对应的 label
            const industryOption = sources.industryCategoryList.find(
              (opt: any) => opt.value === categoryKey,
            );
            const industryLabel = industryOption?.label || String(categoryKey);

            // 主字段存储 label（用于显示）
            row['industryCategory'] = industryLabel;
            // _value 字段存储数值ID（用于联动和保存）
            row['industryCategory_value'] = categoryKey;

            console.log(
              '📋 [handleFeeCodeChange] 应收-行业类别:',
              debitCategory,
              '(字母代码) →',
              categoryKey,
              '(数值ID) →',
              industryLabel,
              '(label)',
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
          // ✅ 修正：将字母代码转换为数值ID
          const option = getIndustryCategoryOptions().find(
            (opt) => opt.value === creditCategory,
          );
          const categoryKey = option?.key;

          if (categoryKey) {
            // ✅ 使用 getIndustryCategoryOptions() getter 直接获取 label
            const industryOption = getIndustryCategoryOptions().find(
              (opt) => opt.key === categoryKey,
            );
            const industryLabel = industryOption?.label || String(categoryKey);

            // 主字段存储 label（用于显示）
            row['industryCategory'] = industryLabel;
            // _value 字段存储数值ID（用于联动和保存）
            row['industryCategory_value'] = categoryKey;

            console.log(
              '📋 [handleFeeCodeChange] 应付-行业类别:',
              creditCategory,
              '(字母代码) →',
              categoryKey,
              '(数值ID) →',
              industryLabel,
              '(label)',
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

      // ✅ 关键优化：自动填充币别和汇率（从缓存中获取）
      if (feeCodeDetail.currencyId) {
        // ✅ 使用 getDropdownSources() getter 获取货币选项并查找对应的 label
        const currencyOptions = sources.currencyList;
        const currencyOption = currencyOptions.find(
          (opt: any) => opt.value === feeCodeDetail.currencyId,
        );
        const currencyLabel =
          currencyOption?.label || String(feeCodeDetail.currencyId);

        // 主字段存储 label（用于显示）
        row['currencyId'] = currencyLabel;
        // _value 字段存储币别ID（用于联动和保存）
        row['currencyId_value'] = feeCodeDetail.currencyId;

        console.log(
          '💰 [handleFeeCodeChange] 设置币别:',
          feeCodeDetail.currencyId,
          '(ID) →',
          currencyLabel,
          '(label)',
        );

        // ✅ 关键优化：从费用代码缓存中获取汇率，避免调用 getExchangeRateDetail API
        const exchangeRate = getExchangeRateFromFeeCodeCache(
          feeCodeId,
          feeCodeDetail.currencyId,
        );

        if (exchangeRate !== undefined) {
          row['exchangeRate'] = exchangeRate;
          row['__isLocalCurrency'] = false;
          console.log('💱 [handleFeeCodeChange] 从缓存获取汇率:', exchangeRate);
        } else {
          // 如果缓存中没有汇率，判断是否为本位币
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
            console.warn(
              '⚠️ [handleFeeCodeChange] 无法获取汇率，请检查费用代码配置',
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
        // ✅ 同步设置 _value 字段
        row['unit_value'] = defaultUnitName;
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

      console.log(
        '✅ [handleFeeCodeChange] 联动完成',
        dataContext.dataSource.value,
      );
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

      // ✅ 使用 getter 获取行业类别选项并查找对应的 label
      const industryOptions = getIndustryCategoryOptions();
      const industryOption = industryOptions.find(
        (opt: any) => opt.key === industryCategory,
      );
      const industryLabel = industryOption?.label || String(industryCategory);

      // 主字段存储 label（用于显示）
      row['industryCategory'] = industryLabel;
      // _value 字段存储数值ID（用于联动和保存）
      row['industryCategory_value'] = industryCategory;

      // ✅ 修正：industryCategory 是数值ID，需要转换为字母代码用于联动
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

      // ✅ 使用 getDropdownSources() getter 获取货币选项并查找对应的 label
      const sources = getDropdownSources();
      const currencyOptions = sources.currencyList;
      const currencyOption = currencyOptions.find(
        (opt: any) => opt.value === currencyId,
      );
      const currencyLabel = currencyOption?.label || String(currencyId);

      // 主字段存储 label（用于显示）
      row['currencyId'] = currencyLabel;
      // _value 字段存储币别ID（用于联动和保存）
      row['currencyId_value'] = currencyId;

      if (currencyId) {
        // ✅ 关键优化：优先从汇率缓存中获取汇率
        const exchangeRate = getExchangeRateFromCache(currencyId, props.type);

        if (exchangeRate !== undefined) {
          row['exchangeRate'] = exchangeRate;
          row['__isLocalCurrency'] = false;
          console.log(
            '💱 [handleCurrencyChange] 从汇率缓存获取汇率:',
            exchangeRate,
          );
        } else {
          // 如果汇率缓存中没有，尝试从费用代码缓存中获取
          const feeCodeId = row['feeCodeId_value'];
          if (feeCodeId) {
            const feeCodeExchangeRate = getExchangeRateFromFeeCodeCache(
              feeCodeId,
              currencyId,
            );

            if (feeCodeExchangeRate !== undefined) {
              row['exchangeRate'] = feeCodeExchangeRate;
              row['__isLocalCurrency'] = false;
              console.log(
                '💱 [handleCurrencyChange] 从费用代码缓存获取汇率:',
                feeCodeExchangeRate,
              );
            } else {
              // 如果两个缓存都没有，判断是否为本位币
              const isLocalCurrency = await checkIfIsLocalCurrency(currencyId);

              if (isLocalCurrency) {
                row['exchangeRate'] = 1;
                row['__isLocalCurrency'] = true;
                row['__editing_exchangeRate'] = false;
                console.log('💱 [handleCurrencyChange] 本位币，汇率设为1');
              } else {
                console.warn(
                  '⚠️ [handleCurrencyChange] 无法从缓存获取汇率，请手动输入',
                );
              }
            }
          } else {
            // 没有费用代码时，判断是否为本位币
            const isLocalCurrency = await checkIfIsLocalCurrency(currencyId);

            if (isLocalCurrency) {
              row['exchangeRate'] = 1;
              row['__isLocalCurrency'] = true;
              row['__editing_exchangeRate'] = false;
              console.log('💱 [handleCurrencyChange] 本位币，汇率设为1');
            } else {
              console.warn(
                '⚠️ [handleCurrencyChange] 无费用代码，无法从缓存获取汇率',
              );
            }
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

      // ✅ 单位的 label 和 value 相同，都存储到主字段和 _value 字段
      row['unit'] = unitName;
      row['unit_value'] = unitName;

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

  function getSettlementId(settlementName: any) {
    if (!settlementName) return undefined;

    const sources = getDropdownSources();
    const allClientsByIndustry = sources.allClientsByIndustry;

    if (
      !allClientsByIndustry ||
      Object.keys(allClientsByIndustry).length === 0
    ) {
      console.warn('⚠️ [getSettlementId] 客户缓存数据为空');
      return undefined;
    }

    // 遍历所有行业类别的客户列表，查找匹配的客户名称
    for (const industry of Object.keys(allClientsByIndustry)) {
      const clients = allClientsByIndustry[industry];
      if (!clients || !Array.isArray(clients)) continue;

      // 查找匹配的客户（支持精确匹配 name 字段）
      const matchedClient = clients.find(
        (client) =>
          client.name === settlementName || client.label === settlementName,
      );

      if (matchedClient) {
        console.log(
          `✅ [getSettlementId] 找到客户: ${settlementName}, ID: ${matchedClient.value}`,
        );
        return matchedClient.value;
      }
    }

    console.warn(`⚠️ [getSettlementId] 未找到客户: ${settlementName}`);
    return undefined;
  }
  /**
   * 统一的 afterChange 处理器
   */
  function handleAfterChange(changes: any, source: string, hotInstance: any) {
    if (source === 'loadData' || !changes) return;

    console.log('🔄 [handleAfterChange] 数据变化:', changes);

    // 处理数据变化时的联动逻辑
    changes.forEach(([rowIndex, prop, oldValue, newValue]: any[]) => {
      const row = dataContext.dataSource.value[rowIndex];
      if (!row) return;

      // 费用代码变化 - 使用 _value 字段
      if (prop === 'feeCodeId') {
        const feeCodeValue = row['feeCodeId_value'] || newValue;
        handleFeeCodeChange(rowIndex, feeCodeValue, hotInstance);
      }
      // 行业类别变化 - 使用 _value 字段
      else if (prop === 'industryCategory') {
        const industryCategoryValue = row['industryCategory_value'] || newValue;
        handleIndustryCategoryChange(
          rowIndex,
          industryCategoryValue,
          hotInstance,
        );
      }
      // 币别变化 - 使用 _value 字段
      else if (prop === 'currencyId') {
        const currencyValue = row['currencyId_value'] || newValue;
        handleCurrencyChange(rowIndex, currencyValue, hotInstance);
      }
      // 单位变化 - 使用 _value 字段
      else if (prop === 'unit') {
        const unitValue = row['unit_value'] || newValue;
        handleUnitChange(rowIndex, unitValue, hotInstance);
      }
      // 结算对象变化 - 使用 _value 字段
      else if (prop === 'settlementId') {
        // settlementId 的联动逻辑在 fillSettlementIdByIndustryCategory 中处理

        if (!row['settlementId_value']) {
          row['settlementId_value'] = getSettlementId(row['settlementId']);
        }
        console.log(
          '👤 [handleAfterChange] 结算对象变化:',
          row['settlementId_value'],
        );
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
    getSettlementId, // ✅ 新增：根据客户名称获取客户ID
    // ✅ 新增：导出汇率缓存获取方法
    getExchangeRateFromFeeCodeCache,
    getExchangeRateFromCache,
    // ✅ 新增：导出更新订单详情缓存的方法
    updateOrderDetailCache,
  };
}
