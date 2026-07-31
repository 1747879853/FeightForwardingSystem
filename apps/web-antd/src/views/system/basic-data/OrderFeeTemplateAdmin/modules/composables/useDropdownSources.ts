import { ref } from 'vue';
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';
import { getClientGroupedByIndustryCategory } from '#/api/common/client';
import { message } from 'ant-design-vue';

/**
 * 费用模板表格下拉数据源管理
 */
export function useDropdownSources() {
  // 费用代码列表
  const feeCodeList = ref<
    Array<{
      label: string;
      value: number;
      currencyId?: number;
      unit?: string;
      taxRate?: number;
    }>
  >([]);

  // 币别列表
  const currencyList = ref<Array<{ label: string; value: number }>>([]);

  // 客户列表（按行业类别分组）
  const clientListByIndustry = ref<
    Record<string, Array<{ label: string; value: number }>>
  >({});

  // ✅ 新增：全量客户缓存（按行业类别分组）
  const allClientsByIndustry = ref<
    Record<string, Array<{ label: string; value: any }>>
  >({});

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
          // ✅ 关键修复：将行业类别信息添加到每个客户对象中
          const clients = group.value.map((client: any) => ({
            label: `${client.code}-${client.name}`,
            value: client.id,
            industryCategory: group.key, // ✅ 添加行业类别字段
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
   * 根据行业类别获取结算对象列表
   */
  const getSettlementList = (industryCategory: string) => {
    return clientListByIndustry.value[industryCategory] || [];
  };

  /**
   * 根据费用代码ID获取费用详情
   */
  const getFeeCodeDetail = (feeCodeId: number) => {
    return feeCodeList.value.find((item) => item.value === feeCodeId);
  };

  return {
    feeCodeList,
    currencyList,
    clientListByIndustry,
    allClientsByIndustry, // ✅ 新增：导出全量客户缓存
    getSettlementList,
    getFeeCodeDetail,
    loadAllClients, // ✅ 新增：导出一次性加载方法
    loadClientList, // ✅ 新增：导出从缓存获取客户列表的方法
  };
}
