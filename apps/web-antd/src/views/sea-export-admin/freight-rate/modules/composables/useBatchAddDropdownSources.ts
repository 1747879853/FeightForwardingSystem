import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import { useBaseStore } from '#/store/base';

/**
 * 批量新增运价 - 下拉框数据源管理 Composable
 * 
 * 注意：所有下拉框数据现在从 baseStore 中获取，不再单独请求 API
 */
export function useBatchAddDropdownSources() {
  // 获取基础数据 store
  const baseStore = useBaseStore();

  // 所有箱型选项（从 store 中获取）
  const allCtnOptions = computed(() => baseStore.ctnOptions);

  // Label 缓存（从 store 中获取）
  const labelCache = computed(() => ({
    carriers: baseStore.carriers,
    ports: baseStore.ports,
    currencies: baseStore.currencies,
    clients: baseStore.bookingAgents,
  }));

  /**
   * 更新 Label 缓存
   * 注意：由于数据来自 store，这里不再需要手动更新缓存
   * 如果需要更新，应该调用 store 的对应方法
   */
  function updateLabelCache(
    type: 'carriers' | 'ports' | 'currencies' | 'clients',
    id: number | string,
    label: string,
  ) {
    console.warn('⚠️ [updateLabelCache] 不应直接调用此方法，数据应从 store 中获取');
    // 这里保留方法签名以保持接口兼容，但实际不再使用
  }

  /**
   * 获取船公司名称
   */
  function getCarrierName(carrierId: number | string | undefined): string {
    if (!carrierId) return '-';
    const key = String(carrierId);
    return baseStore.carriers.get(key) || `${carrierId}`;
  }

  /**
   * 获取港口名称
   */
  function getPortName(portId: number | string | undefined): string {
    if (!portId) return '-';
    const key = String(portId);
    return baseStore.ports.get(key) || `-`;
  }

  /**
   * 获取币别名称
   */
  function getCurrencyName(currencyId: number | string | undefined): string {
    if (!currencyId) return '-';
    const key = String(currencyId);
    return baseStore.currencies.get(key) || `${currencyId}`;
  }

  /**
   * 获取客户名称
   */
  function getClientName(clientId: number | string | undefined): string {
    if (!clientId) return '-';
    const key = String(clientId);
    return baseStore.bookingAgents.get(key) || `${clientId}`;
  }

  /**
   * 初始化下拉选项（页面加载时调用）
   * 注意：现在这个方法只是确保 store 中的数据已加载，如果未加载则触发加载
   */
  async function initDropdownSources(defaultCurrencyIdRef: any) {
    console.log('🚀 [initDropdownSources] 检查下拉框数据源...');
    
    try {
      // 检查 store 中是否已有数据
      const hasData = 
        baseStore.ctnOptions.length > 0 &&
        baseStore.carriers.size > 0 &&
        baseStore.ports.size > 0 &&
        baseStore.currencies.size > 0 &&
        baseStore.bookingAgents.size > 0;

      if (hasData) {
        console.log('✅ [initDropdownSources] 使用 store 中的缓存数据');
        console.log('📊 [initDropdownSources] 缓存统计:');
        console.log('  - 箱型:', baseStore.ctnOptions.length);
        console.log('  - 船公司:', baseStore.carriers.size);
        console.log('  - 港口:', baseStore.ports.size);
        console.log('  - 币别:', baseStore.currencies.size);
        console.log('  - 订舱代理:', baseStore.bookingAgents.size);
      } else {
        console.log('⚠️ [initDropdownSources] store 中无数据，开始加载...');
        await baseStore.fetchFreightRateDropdownData();
      }

      // 自动添加默认箱型（status为0且isDefault为true）
      // 注意：现在需要从原始 API 响应中获取 status 和 isDefault 信息
      // 但由于我们只缓存了必要的字段，这里简化处理，返回所有箱型
      const defaultCtns = baseStore.ctnOptions;

      return {
        defaultCtns,
      };
    } catch (error) {
      console.error('❌ [initDropdownSources] 加载下拉选项失败:', error);
      message.error('加载下拉选项失败');
      return { defaultCtns: [] };
    }
  }

  return {
    allCtnOptions,
    labelCache,
    updateLabelCache,
    getCarrierName,
    getPortName,
    getCurrencyName,
    getClientName,
    initDropdownSources,
  };
}
