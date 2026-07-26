import { acceptHMRUpdate, defineStore } from 'pinia';

import type { ClientAppApi } from '#/api/common/client';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { getClientPagedList } from '#/api/common/client';
import { getOrganizationUnits } from '#/api/system/organization-unit';

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
    },
  },
  state: (): BaseState => ({
    clients: [],
    companyOrganizations: [],
    clientsLoading: false,
    companyOrganizationsLoading: false,
  }),
});

// 解决热更新问题
const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useBaseStore, hot));
}
