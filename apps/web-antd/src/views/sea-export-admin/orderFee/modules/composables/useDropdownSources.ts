import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { getFeeCodePagedList } from '#/api/system/base-data/fee-code-admin';
// ✅ 修改：使用通用客户API接口，数据量更少，效率更高
import { getClientPagedList } from '#/api/common/client';
import {
  getIndustryCategoryOptions as getIndustryCategoryOptionsFromData,
  getCurrencyEnumOptions,
} from '../../data';
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

      const currencyOptions = getCurrencyEnumOptions().filter(
        (opt) => opt.value !== 9999,
      );
      dropdownSources.value.currencyList = currencyOptions.map((opt) => ({
        label: opt.label,
        value: opt.value,
      }));
    } catch (error) {
      console.error('❌ [initDropdownSources] 初始化失败:', error);
    }
  };

  /**
   * 更新单位列表（根据订单箱型动态更新）
   */
  const updateUnitList = () => {
    const ctnUnits = orderCtnList.value.map((ctn: any) => ({
      label: ctn.ctnCodeName,
      value: ctn.ctnCodeName,
    }));

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
  };

  /**
   * 获取费用代码列表
   */
  const getFeeCodeList = async () => {
    try {
      const res = await getFeeCodePagedList({ PageIndex: 1, PageSize: 1000 });
      const feeCodeList = res.items || [];

      dropdownSources.value.feeCodeList = feeCodeList.map((item: any) => {
        const surLabel = item.cnName || item.enName || '';
        const label = item.code ? `${item.code}-${surLabel}` : surLabel;
        return {
          label: label || item.cnName || item.enName || item.code || '',
          value: item.id,
        };
      });
    } catch (error) {
      console.error('❌ [getFeeCodeList] 加载失败:', error);
    }
  };

  /**
   * ✅ 新增：一次性加载全部客户数据并按行业类别缓存
   */
  const loadAllClients = async () => {
    try {
      console.log('🔄 [loadAllClients] 开始加载全部客户数据...');

      // 获取所有行业类别
      const industryOptions = getIndustryCategoryOptionsFromData();
      const industryValues = industryOptions
        .map((opt) => opt.value)
        .filter(Boolean);

      // 并行加载所有行业类别的客户
      const loadPromises = industryValues.map(async (industryValue) => {
        try {
          // ✅ 修改：使用小驼峰命名，与新API接口参数匹配
          const response = await getClientPagedList({
            industryCategory: industryValue,
            keyword: '',
            pageIndex: 1,
            pageSize: 700, // 增大 PageSize 以获取更多数据
          });

          const items = response.items || [];
          const options = items.map((client: any) => ({
            label: client.name,
            value: client.id,
            ...client,
          }));

          return { industry: industryValue, clients: options };
        } catch (error) {
          console.error(
            `❌ [loadAllClients] 加载行业类别 ${industryValue} 的客户失败:`,
            error,
          );
          return { industry: industryValue, clients: [] };
        }
      });

      const results = await Promise.all(loadPromises);

      // 构建按行业类别分组的缓存
      results.forEach(({ industry, clients }) => {
        if (industry && clients.length > 0) {
          allClientsByIndustry.value[industry] = clients;
        }
      });

      console.log(
        `✅ [loadAllClients] 加载完成，共缓存 ${Object.keys(allClientsByIndustry.value).length} 个行业类别的客户数据`,
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
   */
  const loadClientList = async (industryCategory: string, keyword?: string) => {
    try {
      // 从缓存中获取对应行业类别的客户
      const cachedClients = allClientsByIndustry.value[industryCategory] || [];

      if (!cachedClients || cachedClients.length === 0) {
        console.warn(
          `⚠️ [loadClientList] 行业类别 ${industryCategory} 没有缓存的客户数据`,
        );
        return [];
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

      console.log(
        `✅ [loadClientList] 从缓存获取行业类别 ${industryCategory} 的客户，共 ${filteredClients.length} 个`,
      );
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
    initDropdownSources,
    updateUnitList,
    getFeeCodeList,
    loadAllClients, // ✅ 导出一性加载方法
    loadClientList,
    getSettlementIndustryCategory,
  };
}
