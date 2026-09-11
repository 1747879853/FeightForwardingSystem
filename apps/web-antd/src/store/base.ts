import { acceptHMRUpdate, defineStore } from 'pinia';

import type { ClientAppApi } from '#/api/common/client';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { getClientPagedList } from '#/api/common/client';
import { getOrganizationUnits } from '#/api/system/organization-unit';
import type { isDef } from '@vueuse/core';
import type { un } from 'vue-router/dist/router-CWoNjPRp.mjs';

interface BaseState {
  /**
   * 客户基础信息缓存
   * 数据来源: getClientPagedList (不传industryCategory参数获取全部类型客户)
   *
   * 取值方式:
   * - 直接访问: useBaseStore().clients
   * - 解构: const { clients } = useBaseStore()
   *
   * 赋值方式:
   * - 手动设置: store.setClients(clients)
   * - API获取: await store.fetchClients()
   */
  clients: ClientAppApi.ClientSimpleDto[];

  /**
   * 客户公司信息缓存（isCompany=true的组织）
   * 数据来源: getOrganizationUnits({ isCompany: true })
   *
   * 取值方式:
   * - 直接访问: useBaseStore().companyOrganizations
   * - 解构: const { companyOrganizations } = useBaseStore()
   *
   * 赋值方式:
   * - 手动设置: store.setCompanyOrganizations(companies)
   * - API获取: await store.fetchCompanyOrganizations()
   */
  companyOrganizations: SystemOrganizationUnitApi.OrganizationUnitDto[];

  /**
   * 客户数据加载状态
   */
  clientsLoading: boolean;

  /**
   * 公司组织数据加载状态
   */
  companyOrganizationsLoading: boolean;

  // ==================== 运价批量新增下拉框数据缓存 ====================

  /**
   * 箱型列表缓存
   * 数据来源: getBaseCtnCodes
   */
  ctnOptions: Array<{
    ctnCodeId: string | number;
    ctnName: string;
    isDefault: boolean | undefined;
  }>;

  /**
   * 船公司缓存（Map格式：id -> name）
   * 数据来源: getCarrierPagedList
   */
  carriers: Map<string, string>;

  /**
   * 港口缓存（Map格式：id -> name）
   * 运价批量新增已改为远程分页搜索，不再预载全量；此 Map 仅作零星回显兜底。
   */
  ports: Map<string, string>;

  /**
   * 币别缓存（Map格式：id -> code）
   * 数据来源: getCurrencyPagedList
   */
  currencies: Map<string, string>;

  /**
   * 订舱代理缓存（Map格式：id -> name）
   * 数据来源: getClientGroupedByIndustryCategory (行业类型为 'o')
   */
  bookingAgents: Map<string, string>;

  /**
   * 运价下拉框数据加载状态
   */
  freightRateDropdownLoading: boolean;
}

/**
 * @zh_CN 基础数据缓存相关
 * 用于缓存全局常用的基础数据，如客户信息、组织信息等
 */
export const useBaseStore = defineStore('core-base', {
  actions: {
    /**
     * 设置客户基础信息缓存
     * @param clients 客户列表数据
     *
     * 使用示例:
     * ```typescript
     * const store = useBaseStore();
     * store.setClients(clientList);
     * ```
     */
    setClients(clients: ClientAppApi.ClientSimpleDto[]) {
      this.clients = clients;
    },

    /**
     * 从API获取并设置客户基础信息
     * 调用 getClientPagedList 获取全部类型的客户（不传industryCategory参数）
     *
     * @param params 可选的查询参数（pageIndex, pageSize等）
     * @returns 客户列表数据
     *
     * 使用示例:
     * ```typescript
     * const store = useBaseStore();
     * await store.fetchClients({ pageIndex: 1, pageSize: 1000 });
     * const clients = store.clients; // 获取缓存的客户数据
     * ```
     */
    async fetchClients(params?: {
      keyword?: string;
      pageIndex?: number;
      pageSize?: number;
      sorting?: string;
    }) {
      this.clientsLoading = true;
      try {
        // 注意：不传 industryCategory 参数以获取全部类型的客户
        const response = await getClientPagedList({
          industryCategory: '', // 空字符串表示不筛选行业类别，获取全部客户
          keyword: params?.keyword,
          pageIndex: params?.pageIndex ?? 1,
          pageSize: params?.pageSize ?? 1000, // 默认获取较多数据用于缓存
          sorting: params?.sorting,
        });
        this.clients = response.items || [];
        return response.items;
      } catch (error) {
        console.error('❌ 获取客户基础信息失败:', error);
        throw error;
      } finally {
        this.clientsLoading = false;
      }
    },

    /**
     * 设置客户公司信息缓存
     * @param companies 公司组织列表数据
     *
     * 使用示例:
     * ```typescript
     * const store = useBaseStore();
     * store.setCompanyOrganizations(companyList);
     * ```
     */
    setCompanyOrganizations(
      companies: SystemOrganizationUnitApi.OrganizationUnitDto[],
    ) {
      this.companyOrganizations = companies;
    },

    /**
     * 从API获取并设置客户公司信息
     * 调用 getOrganizationUnits({ isCompany: true }) 获取所有公司类型的组织
     *
     * @param params 可选的查询参数（isDisabled等）
     * @returns 公司组织列表数据
     *
     * 使用示例:
     * ```typescript
     * const store = useBaseStore();
     * await store.fetchCompanyOrganizations({ isDisabled: false });
     * const companies = store.companyOrganizations; // 获取缓存的公司数据
     * ```
     */
    async fetchCompanyOrganizations(params?: { isDisabled?: boolean }) {
      this.companyOrganizationsLoading = true;
      try {
        // 注意：isCompany 参数传 true 以只获取公司类型的组织
        const companies = await getOrganizationUnits({
          isCompany: true, // 只获取公司类型的组织
          isDisabled: params?.isDisabled,
        });
        this.companyOrganizations = companies || [];
        return companies;
      } catch (error) {
        console.error('❌ 获取客户公司信息失败:', error);
        throw error;
      } finally {
        this.companyOrganizationsLoading = false;
      }
    },

    // ==================== 运价批量新增下拉框数据缓存方法 ====================

    /**
     * 设置箱型列表缓存
     * @param ctns 箱型列表数据
     */
    setCtnOptions(
      ctns: Array<{
        ctnCodeId: string | number;
        ctnName: string;
        isDefault: boolean;
      }>,
    ) {
      this.ctnOptions = ctns;
    },

    /**
     * 设置船公司缓存
     * @param carriers 船公司Map（id -> name）
     */
    setCarriers(carriers: Map<string, string>) {
      this.carriers = new Map(carriers);
    },

    /**
     * 设置港口缓存
     * @param ports 港口Map（id -> name）
     */
    setPorts(ports: Map<string, string>) {
      this.ports = new Map(ports);
    },

    /**
     * 设置币别缓存
     * @param currencies 币别Map（id -> code）
     */
    setCurrencies(currencies: Map<string, string>) {
      this.currencies = new Map(currencies);
    },

    /**
     * 设置订舱代理缓存
     * @param bookingAgents 订舱代理Map（id -> name）
     */
    setBookingAgents(bookingAgents: Map<string, string>) {
      this.bookingAgents = new Map(bookingAgents);
    },

    /**
     * 从API获取并设置运价批量新增所需的所有下拉框数据
     *
     * 使用示例:
     * ```typescript
     * const store = useBaseStore();
     * await store.fetchFreightRateDropdownData();
     * ```
     */
    async fetchFreightRateDropdownData() {
      console.log(
        '🚀 [fetchFreightRateDropdownData] 开始加载运价下拉框数据...',
      );
      this.freightRateDropdownLoading = true;

      try {
        // 动态导入 API 函数，避免循环依赖
        const { getCtnCodePagedList } =
          await import('#/api/system/base-data/ctn-code-admin');
        const { getCurrencyPagedList } =
          await import('#/api/system/base-data/currency-admin');

        // 1. 加载箱型列表
        console.log('📦 [fetchFreightRateDropdownData] 正在加载箱型列表...');
        const ctns = await getCtnCodePagedList({
          PageIndex: 1,
          PageSize: 1000,
          Sorting: 'OrderNo',
        });

        const ctnOptions =
          ctns?.items?.map((item) => ({
            ctnCodeId: item.id,
            ctnName: item.ctnName || '',
            isDefault: item.isDefault,
          })) || [];
        this.setCtnOptions(ctnOptions);
        console.log(
          `✅ [fetchFreightRateDropdownData] 已缓存 ${ctnOptions.length} 个箱型`,
        );

        // 2. 加载币别列表
        console.log('💰 [fetchFreightRateDropdownData] 正在加载币别列表...');
        const currencies = await getCurrencyPagedList({
          PageIndex: 1,
          PageSize: 100,
        });

        const currencyMap = new Map<string, string>();
        currencies.items?.forEach((currency) => {
          if (currency.id) {
            currencyMap.set(String(currency.id), currency.code || '');
          }
        });
        this.setCurrencies(currencyMap);
        console.log(
          `✅ [fetchFreightRateDropdownData] 已缓存 ${currencyMap.size} 个币别`,
        );

        // 3. 港口改为 Handsontable 远程分页搜索，不再全量 GetListAsync（几万条卡顿且可能截断）
        console.log(
          '🚢 [fetchFreightRateDropdownData] 跳过港口全量加载（改用远程搜索）',
        );
        if (this.ports.size === 0) {
          this.setPorts(new Map());
        }

        // 4. 船公司改为远程分页搜索
        console.log(
          '🏢 [fetchFreightRateDropdownData] 跳过船公司全量加载（改用远程搜索）',
        );
        if (this.carriers.size === 0) {
          this.setCarriers(new Map());
        }

        // 5. 订舱代理改为远程分页搜索（行业类型 'o'）
        console.log(
          '👥 [fetchFreightRateDropdownData] 跳过订舱代理全量加载（改用远程搜索）',
        );
        if (this.bookingAgents.size === 0) {
          this.setBookingAgents(new Map());
        }

        // 输出最终缓存统计
        console.log('📊 [fetchFreightRateDropdownData] 缓存统计:');
        console.log('  - 箱型:', this.ctnOptions.length);
        console.log('  - 船公司(远程搜索):', this.carriers.size);
        console.log('  - 港口(远程搜索):', this.ports.size);
        console.log('  - 币别:', this.currencies.size);
        console.log('  - 订舱代理(远程搜索):', this.bookingAgents.size);
      } catch (error) {
        console.error(
          '❌ [fetchFreightRateDropdownData] 加载运价下拉框数据失败:',
          error,
        );
        throw error;
      } finally {
        this.freightRateDropdownLoading = false;
      }
    },

    /**
     * 清空所有缓存数据
     *
     * 使用示例:
     * ```typescript
     * const store = useBaseStore();
     * store.clearAllCache();
     * ```
     */
    clearAllCache() {
      this.clients = [];
      this.companyOrganizations = [];
      this.clientsLoading = false;
      this.companyOrganizationsLoading = false;

      // 清空运价下拉框数据
      this.ctnOptions = [];
      this.carriers = new Map();
      this.ports = new Map();
      this.currencies = new Map();
      this.bookingAgents = new Map();
      this.freightRateDropdownLoading = false;
    },
  },
  state: (): BaseState => ({
    clients: [],
    companyOrganizations: [],
    clientsLoading: false,
    companyOrganizationsLoading: false,

    // 运价批量新增下拉框数据初始值
    ctnOptions: [],
    carriers: new Map(),
    ports: new Map(),
    currencies: new Map(),
    bookingAgents: new Map(),
    freightRateDropdownLoading: false,
  }),
});

// 解决热更新问题
const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useBaseStore, hot));
}
