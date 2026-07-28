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
  ctnOptions: Array<{ ctnCodeId: string | number; ctnName: string; isDefault: boolean | undefined }>;

  /**
   * 船公司缓存（Map格式：id -> name）
   * 数据来源: getCarrierPagedList
   */
  carriers: Map<string, string>;

  /**
   * 港口缓存（Map格式：id -> name）
   * 数据来源: getPortCodeList
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
    setCtnOptions(ctns: Array<{ ctnCodeId: string | number; ctnName: string ; isDefault: boolean }>) {
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
      console.log('🚀 [fetchFreightRateDropdownData] 开始加载运价下拉框数据...');
      this.freightRateDropdownLoading = true;

      try {
        // 动态导入 API 函数，避免循环依赖
        const { getCtnCodePagedList } = await import('#/api/system/base-data/ctn-code-admin');
        const { getCurrencyPagedList } = await import('#/api/system/base-data/currency-admin');
        const { getPortCodeList } = await import('#/api/system/base-data/port-code-admin');
        const { getCarrierPagedList } = await import('#/api/system/base-data/carrier-admin');
        const { getClientGroupedByIndustryCategory } = await import('#/api/common/client');

        // 1. 加载箱型列表
        console.log('📦 [fetchFreightRateDropdownData] 正在加载箱型列表...');
        const ctns = await getCtnCodePagedList({
          PageIndex: 1,
          PageSize: 1000,
          Sorting: 'OrderNo',
        });

        const ctnOptions = ctns?.items?.map((item) => ({
          ctnCodeId: item.id,
          ctnName: item.ctnName || '',
          isDefault: item.isDefault,
        })) || [];
        this.setCtnOptions(ctnOptions);
        console.log(`✅ [fetchFreightRateDropdownData] 已缓存 ${ctnOptions.length} 个箱型`);

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
        console.log(`✅ [fetchFreightRateDropdownData] 已缓存 ${currencyMap.size} 个币别`);

        // 3. 加载港口列表
        console.log('🚢 [fetchFreightRateDropdownData] 正在加载港口列表...');
        const ports = await getPortCodeList();

        const portMap = new Map<string, string>();
        ports?.forEach((port) => {
          if (port.i) {
            const countryEnName = (port.e ?? '').toString().trim();
            const portName = `${port.p}/${countryEnName}`;
            portMap.set(String(port.i), portName);
          }
        });
        this.setPorts(portMap);
        console.log(`✅ [fetchFreightRateDropdownData] 已缓存 ${portMap.size} 个港口`);

        // 4. 加载船公司列表
        console.log('🏢 [fetchFreightRateDropdownData] 正在加载船公司列表...');
        const carriers = await getCarrierPagedList({
          PageIndex: 1,
          PageSize: 1000,
        });

        const carrierMap = new Map<string, string>();
        carriers?.items?.forEach((carrier) => {
          if (carrier.id) {
            const code = carrier.code || '';
            const cnShortName = carrier.cnShortName || carrier.cnName || carrier.enName || '';
            const carrierName = code && cnShortName ? `${code}(${cnShortName})` : (cnShortName || code);
            carrierMap.set(String(carrier.id), carrierName);
          }
        });
        this.setCarriers(carrierMap);
        console.log(`✅ [fetchFreightRateDropdownData] 已缓存 ${carrierMap.size} 个船公司`);

        // 5. 加载订舱代理列表（行业类型为 'o' 的客户）
        console.log('👥 [fetchFreightRateDropdownData] 正在加载订舱代理列表...');
        const clientGroups = await getClientGroupedByIndustryCategory();

        const bookingAgentMap = new Map<string, string>();
        const bookingAgentGroup = clientGroups?.find(
          (group) => group.key === 'o',
        );

        if (bookingAgentGroup && bookingAgentGroup.value) {
          bookingAgentGroup.value.forEach((client) => {
            if (client.id) {
              const clientName = client.name || client.fullName || '';
              bookingAgentMap.set(String(client.id), clientName);
            }
          });
          console.log(`✅ [fetchFreightRateDropdownData] 已缓存 ${bookingAgentMap.size} 个订舱代理`);
        } else {
          console.warn('⚠️ [fetchFreightRateDropdownData] 未找到行业类型为 "o" 的订舱代理数据');
        }
        this.setBookingAgents(bookingAgentMap);

        // 输出最终缓存统计
        console.log('📊 [fetchFreightRateDropdownData] 缓存统计:');
        console.log('  - 箱型:', this.ctnOptions.length);
        console.log('  - 船公司:', this.carriers.size);
        console.log('  - 港口:', this.ports.size);
        console.log('  - 币别:', this.currencies.size);
        console.log('  - 订舱代理:', this.bookingAgents.size);

      } catch (error) {
        console.error('❌ [fetchFreightRateDropdownData] 加载运价下拉框数据失败:', error);
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
