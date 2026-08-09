import { ref } from 'vue';
import { message } from 'ant-design-vue';
// ✅ 修改：使用新的 getFeeCodeListAsync 接口（非 Admin，无需权限）
import { getFeeCodeListAsync } from '#/api/system/base-data/fee-code-admin';
// ✅ 修改：使用通用客户API接口，一次性按行业类别分组获取客户数据
import { getClientGroupedByIndustryCategory } from '#/api/common/client';
// ✅ 新增：导入币别列表接口
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
// ✅ 新增：导入汇率列表接口
import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';
import { getIndustryCategoryOptions as getIndustryCategoryOptionsFromData } from '../../data';
import * as clientConstants from '#/views/client/base/data';

/**
 * 下拉框数据源管理 Composable
 */
export function useDropdownSources(orderCtnList: any) {
  const dropdownSources = ref({
    feeCodeList: [] as Array<{ label: string; value: any }>,
    industryCategoryList: [] as Array<{ label: string; value: any }>,
    currencyList: [] as Array<{ label: string; value: any }>,
    unitList: [] as Array<{ label: string; value: any }>,
  });

  // ✅ 当前选项缓存（用于结算对象等动态加载的字段）
  const currentOptionsCache = ref<Array<{ label: string; value: any }>>([]);

  // ✅ 新增：全量客户缓存（按行业类别分组）
  const allClientsByIndustry = ref<
    Record<string, Array<{ label: string; value: any }>>
  >({});

  // ✅ 新增：费用代码详情缓存（用于快速填充其他字段）
  // Key: feeCodeId (string), Value: FeeCodeSimpleDto
  const feeCodeDetailCache = ref<Map<string, any>>(new Map());

  // ✅ 新增：汇率缓存（用于币别选择后自动填充汇率）
  // Key: currencyId (string), Value: ExchangeRateDto（当前有效的汇率记录）
  const exchangeRateCache = ref<Map<string, any>>(new Map());

  /**
   * 初始化下拉框数据源
   */
  const initDropdownSources = async () => {
    try {
      const industryOptions = getIndustryCategoryOptionsFromData();

      dropdownSources.value.industryCategoryList = industryOptions.map(
        (opt) => ({
          label: opt.label,
          value: opt.key,
          categoryCode: opt.value,
        }),
      );

      // ✅ 新增：加载费用代码列表并构建缓存
      await getFeeCodeList();

      // ✅ 修改：从后端 API 获取币别列表
      await loadCurrencyList();

      // ✅ 新增：预加载汇率缓存
      await loadExchangeRateCache();
    } catch (error) {
      console.error('❌ [initDropdownSources] 初始化失败:', error);
    }
  };

  /**
   * ✅ 新增：从后端 API 加载币别列表并缓存
   */
  const loadCurrencyList = async () => {
    try {
      console.log('🔄 [loadCurrencyList] 开始加载币别列表...');

      const res = await getCurrencyPagedList({
        PageIndex: 1,
        PageSize: 100, // 获取足够多的币别数据
      });

      const currencyList = res.items || [];

      // 过滤掉"合计"选项（如果后端返回的话），并转换为下拉框格式
      dropdownSources.value.currencyList = currencyList
        .filter((item) => item.id !== 9999) // 排除"合计"
        .map((item) => ({
          label: item.code || item.cnName || item.enName || String(item.id),
          value: item.id,
        }));

      console.log(
        `✅ [loadCurrencyList] 加载完成，共 ${dropdownSources.value.currencyList.length} 个币别`,
      );
    } catch (error) {
      console.error('❌ [loadCurrencyList] 加载币别列表失败:', error);
      message.error('加载币别列表失败');
    }
  };

  /**
   * ✅ 新增：预加载汇率缓存
   * 筛选条件：启用状态 + 当前时间在有效期内
   */
  const loadExchangeRateCache = async () => {
    try {
      console.log('🔄 [loadExchangeRateCache] 开始加载汇率缓存...');

      // 获取所有启用的汇率记录（PageSize设置较大值以获取全部数据）
      const res = await getExchangeRatePagedList({
        PageIndex: 1,
        PageSize: 1000, // 获取足够多的汇率数据
      });

      const exchangeRateList = res.items || [];
      const now = new Date();

      // 筛选出当前有效的汇率记录
      let validCount = 0;
      exchangeRateList.forEach((rate: any) => {
        // 只处理启用状态的汇率
        if (!rate.enable) {
          return;
        }

        // 检查时间有效性
        const startDate = rate.startDate ? new Date(rate.startDate) : null;
        const endDate = rate.endDate ? new Date(rate.endDate) : null;

        // 当前时间必须在开始日期和结束日期之间
        if (startDate && now < startDate) {
          return; // 还未生效
        }
        if (endDate && now > endDate) {
          return; // 已过期
        }

        // 符合条件的汇率加入缓存
        const currencyIdStr = String(rate.currencyId);

        // 如果同一币别有多条有效汇率，按 sortId 降序、id 降序取第一条
        const existingRate = exchangeRateCache.value.get(currencyIdStr);
        if (!existingRate) {
          exchangeRateCache.value.set(currencyIdStr, rate);
          validCount++;
        } else {
          // 比较 sortId 和 id，保留优先级更高的
          const shouldReplace =
            rate.sortId > existingRate.sortId ||
            (rate.sortId === existingRate.sortId && rate.id > existingRate.id);

          if (shouldReplace) {
            exchangeRateCache.value.set(currencyIdStr, rate);
            console.log(
              '🔄 [loadExchangeRateCache] 更新汇率 - 币别:',
              rate.currencyCode,
              '新ID:',
              rate.id,
            );
          }
        }
      });

      console.log(
        `✅ [loadExchangeRateCache] 加载完成，共缓存 ${validCount} 个币别的汇率`,
      );
      console.log(
        '💾 [loadExchangeRateCache] 缓存详情:',
        Array.from(exchangeRateCache.value.entries()).map(
          ([currencyId, rate]) => ({
            currencyId,
            currencyCode: rate.currencyCode,
            drValue: rate.drValue,
            crValue: rate.crValue,
          }),
        ),
      );
    } catch (error) {
      console.error('❌ [loadExchangeRateCache] 加载汇率缓存失败:', error);
      // 不显示错误提示，避免影响用户体验，汇率可以从费用代码缓存中获取
    }
  };

  /**
   * ✅ 新增：根据币别ID从缓存中获取汇率
   * @param currencyId 币别ID
   * @param paySide 收付类型：0-应收（使用drValue），1-应付（使用crValue）
   * @returns 汇率值，如果未找到则返回 undefined
   */
  const getExchangeRateFromCache = (
    currencyId: any,
    paySide: number,
  ): number | undefined => {
    if (!currencyId) {
      console.warn('⚠️ [getExchangeRateFromCache] 币别ID为空');
      return undefined;
    }

    const currencyIdStr = String(currencyId);
    const rate = exchangeRateCache.value.get(currencyIdStr);

    if (!rate) {
      console.warn(
        '⚠️ [getExchangeRateFromCache] 未找到币别',
        currencyId,
        '的汇率缓存',
      );
      return undefined;
    }

    // 根据收付类型选择应收或应付汇率
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
      paySide === 1 ? '应收(drValue)' : '应付(crValue)',
      '汇率:',
      rateValue,
    );

    return rateValue;
  };

  /**
   * ✅ 新增：清空汇率缓存
   */
  const clearExchangeRateCache = () => {
    exchangeRateCache.value.clear();
    console.log('🗑️ [clearExchangeRateCache] 已清空汇率缓存');
  };

  /**
   * 更新单位列表（根据订单箱型动态更新）
   */
  const updateUnitList = () => {
    console.log('🔄 [updateUnitList] 开始更新单位列表...');
    console.log('📦 [updateUnitList] orderCtnList.value:', orderCtnList.value);

    const ctnUnits = orderCtnList.value.map((ctn: any) => ({
      label: ctn.ctnCodeName,
      value: ctn.ctnCodeName,
    }));

    console.log('📦 [updateUnitList] 提取的箱型单位:', ctnUnits);

    const fixedUnits = [
      { label: '票', value: '票' },
      { label: 'TEU', value: 'TEU' },
      { label: '尺码', value: '尺码' },
      { label: '毛重', value: '毛重' },
      { label: '件数', value: '件数' },
    ];

    const allUnits = [...fixedUnits, ...ctnUnits];
    const uniqueUnits = Array.from(
      new Map(allUnits.map((item) => [item.value, item])).values(),
    );

    dropdownSources.value.unitList = uniqueUnits;

    console.log(
      '✅ [updateUnitList] 更新完成，共',
      uniqueUnits.length,
      '个单位选项',
    );
    console.log('✅ [updateUnitList] 单位列表详情:', uniqueUnits);
  };

  /**
   * ✅ 重构：使用新的 getFeeCodeListAsync 接口获取已启用的费用代码全量列表
   * 同时构建费用代码详情缓存，用于快速填充其他字段
   */
  const getFeeCodeList = async () => {
    try {
      console.log('🔄 [getFeeCodeList] 开始加载费用代码列表...');

      // ✅ 使用新接口，无需传参即可获取所有已启用的费用代码
      const feeCodeListData: any[] = (await getFeeCodeListAsync()) as any;

      if (!feeCodeListData || !Array.isArray(feeCodeListData)) {
        console.warn('⚠️ [getFeeCodeList] 返回数据格式不正确');
        return;
      }

      // 转换为下拉框格式
      dropdownSources.value.feeCodeList = feeCodeListData.map((item: any) => {
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;
        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: item.id,
        };
      });

      // ✅ 关键优化：构建费用代码详情缓存
      // 将完整的费用代码信息缓存起来，用于后续快速填充
      feeCodeListData.forEach((feeCode: any) => {
        const feeCodeIdStr = String(feeCode.id);
        feeCodeDetailCache.value.set(feeCodeIdStr, {
          id: feeCode.id,
          code: feeCode.code,
          cnName: feeCode.cnName,
          enName: feeCode.enName,
          currencyId: feeCode.currencyId,
          defaultUnit: feeCode.defaultUnit,
          defaultUnitName: feeCode.defaultUnitName,
          defaultDebit: feeCode.defaultDebit,
          defaultDebitName: feeCode.defaultDebitName,
          defaultCredit: feeCode.defaultCredit,
          defaultCreditName: feeCode.defaultCreditName,
          isConfidential: feeCode.isConfidential,
          isInvoiceProhibit: feeCode.isInvoiceProhibit,
          taxRate: feeCode.taxRate,
          exchangeRate: feeCode.exchangeRate, // ✅ 包含汇率信息
        });
      });

      console.log(
        `✅ [getFeeCodeList] 加载完成，共 ${dropdownSources.value.feeCodeList.length} 个费用代码`,
      );
      console.log(
        `💾 [getFeeCodeList] 费用代码详情缓存大小: ${feeCodeDetailCache.value.size}`,
      );
    } catch (error) {
      console.error('❌ [getFeeCodeList] 加载失败:', error);
      message.error('加载费用代码列表失败');
    }
  };

  /**
   * ✅ 新增：根据费用代码ID获取详情（从缓存中读取）
   * @param feeCodeId 费用代码ID
   * @returns 费用代码详情，如果未找到则返回 null
   */
  const getFeeCodeDetailFromCache = (feeCodeId: any) => {
    if (!feeCodeId) return null;
    const feeCodeIdStr = String(feeCodeId);
    return feeCodeDetailCache.value.get(feeCodeIdStr) || null;
  };

  /**
   * ✅ 新增：清空费用代码详情缓存
   */
  const clearFeeCodeDetailCache = () => {
    feeCodeDetailCache.value.clear();
    console.log('🗑️ [clearFeeCodeDetailCache] 已清空费用代码详情缓存');
  };

  /**
   * ✅ 新增：一次性加载全部客户数据并按行业类别缓存
   * 使用 getClientGroupedByIndustryCategory 接口，无需遍历行业类别
   */
  const loadAllClients = async () => {
    try {
      console.log('🔄 [loadAllClients] 开始加载全部客户数据...');

      // ✅ 调用新接口，一次性获取按行业类别分组的客户数据
      const groupedData = await getClientGroupedByIndustryCategory();

      if (!groupedData || !Array.isArray(groupedData)) {
        console.warn('⚠️ [loadAllClients] 返回数据格式不正确');
        return;
      }

      // 构建按行业类别分组的缓存
      let totalClientCount = 0;
      groupedData.forEach((group) => {
        if (group.key && group.value && group.value.length > 0) {
          // 转换为统一的格式：{label: "编码-名称", value: id, ...client}
          const clients = group.value.map((client: any) => ({
            label: `${client.code}-${client.name}`,
            value: client.id,
            ...client,
          }));

          allClientsByIndustry.value[group.key] = clients;
          totalClientCount += clients.length;
        }
      });

      console.log(
        `✅ [loadAllClients] 加载完成，共缓存 ${Object.keys(allClientsByIndustry.value).length} 个行业类别，总计 ${totalClientCount} 个客户`,
      );
      Object.entries(allClientsByIndustry.value).forEach(
        ([industry, clients]) => {
          console.log(`   - ${industry}: ${clients.length} 个客户`);
        },
      );
    } catch (error) {
      console.error('❌ [loadAllClients] 加载全部客户失败:', error);
      message.error('加载客户数据失败');
    }
  };

  /**
   * ✅ 修改：根据行业类别从缓存中获取客户列表（同步操作）
   * 如果 industryCategory 为空，则返回所有行业类别的客户
   */
  const loadClientList = async (
    industryCategory?: string,
    keyword?: string,
  ) => {
    try {
      let cachedClients: Array<{ label: string; value: any }> = [];

      // ✅ 关键修改：如果没有指定行业类别，合并所有行业类别的客户
      if (!industryCategory || industryCategory.trim() === '') {
        console.log('🔄 [loadClientList] 未指定行业类别，加载全部客户');
        // 合并所有行业类别的客户
        const allIndustryKeys = Object.keys(allClientsByIndustry.value);
        allIndustryKeys.forEach((key) => {
          const clients = allClientsByIndustry.value[key] || [];
          cachedClients = [...cachedClients, ...clients];
        });

        // 去重（基于value/id）
        const uniqueMap = new Map();
        cachedClients.forEach((client) => {
          if (!uniqueMap.has(client.value)) {
            uniqueMap.set(client.value, client);
          }
        });
        cachedClients = Array.from(uniqueMap.values());

        console.log(
          `✅ [loadClientList] 加载全部客户完成，共 ${cachedClients.length} 个`,
        );
      } else {
        // 从缓存中获取对应行业类别的客户
        cachedClients = allClientsByIndustry.value[industryCategory] || [];

        if (!cachedClients || cachedClients.length === 0) {
          console.warn(
            `⚠️ [loadClientList] 行业类别 ${industryCategory} 没有缓存的客户数据`,
          );
          return [];
        }

        console.log(
          `✅ [loadClientList] 从缓存获取行业类别 ${industryCategory} 的客户，共 ${cachedClients.length} 个`,
        );
      }

      // 如果有搜索关键词，进行本地过滤
      let filteredClients = cachedClients;
      if (keyword && keyword.trim()) {
        const keywordLower = keyword.toLowerCase().trim();
        filteredClients = cachedClients.filter((client: any) => {
          const label = client.label?.toLowerCase() || '';
          const name = (client.fullName || client.name || '').toLowerCase();
          const code = (client.code || '').toLowerCase();
          return (
            label.includes(keywordLower) ||
            name.includes(keywordLower) ||
            code.includes(keywordLower)
          );
        });
      }

      return filteredClients;
    } catch (error) {
      console.error('❌ [loadClientList] 处理失败:', error);
      message.error('加载客户列表失败');
      return [];
    }
  };

  /**
   * 获取结算对象行业类别
   */
  const getSettlementIndustryCategory = (industryCategory?: number) => {
    return clientConstants
      .getIndustryCategoryOptions()
      .find((o) => o.key === industryCategory)?.value;
  };

  return {
    dropdownSources,
    currentOptionsCache,
    allClientsByIndustry, // ✅ 导出全量客户缓存
    feeCodeDetailCache, // ✅ 新增：导出费用代码详情缓存
    exchangeRateCache, // ✅ 新增：导出汇率缓存
    initDropdownSources,
    updateUnitList,
    getFeeCodeList,
    getFeeCodeDetailFromCache, // ✅ 新增：导出从缓存获取详情的方法
    clearFeeCodeDetailCache, // ✅ 新增：导出清空缓存的方法
    getExchangeRateFromCache, // ✅ 新增：导出从缓存获取汇率的方法
    clearExchangeRateCache, // ✅ 新增：导出清空汇率缓存的方法
    loadCurrencyList, // ✅ 新增：导出币别加载函数，用于手动刷新
    loadExchangeRateCache, // ✅ 新增：导出汇率缓存加载函数
    loadAllClients, // ✅ 导出一次性加载方法
    loadClientList,
    getSettlementIndustryCategory,
  };
}
