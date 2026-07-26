import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { getCtnCodePagedList as getBaseCtnCodes } from '#/api/system/base-data/ctn-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import { getPortCodePagedList } from '#/api/system/base-data/port-code-admin';
import { getCarrierPagedList } from '#/api/system/base-data/carrier-admin';
import { getCountryCodePagedList } from '#/api/system/base-data/country-code-admin';

/**
 * 批量新增运价 - 下拉框数据源管理 Composable
 */
export function useBatchAddDropdownSources() {
  // 所有箱型选项
  const allCtnOptions = ref<Array<{ ctnCodeId: number; ctnName: string }>>([]);

  // Label 缓存
  const labelCache = ref({
    carriers: new Map<string, string>(),
    ports: new Map<string, string>(),
    currencies: new Map<string, string>(),
    clients: new Map<string, string>(),
  });

  /**
   * 更新 Label 缓存
   */
  function updateLabelCache(
    type: 'carriers' | 'ports' | 'currencies' | 'clients',
    id: number | string,
    label: string,
  ) {
    const key = String(id);
    labelCache.value[type].set(key, label);
  }

  /**
   * 获取船公司名称
   */
  function getCarrierName(carrierId: number | string | undefined): string {
    if (!carrierId) return '-';
    const key = String(carrierId);
    return labelCache.value.carriers.get(key) || `船公司(${carrierId})`;
  }

  /**
   * 获取港口名称
   */
  function getPortName(portId: number | string | undefined): string {
    if (!portId) return '-';
    const key = String(portId);
    return labelCache.value.ports.get(key) || `-`;
  }

  /**
   * 获取币别名称
   */
  function getCurrencyName(currencyId: number | string | undefined): string {
    if (!currencyId) return '-';
    const key = String(currencyId);
    return labelCache.value.currencies.get(key) || `币别(${currencyId})`;
  }

  /**
   * 获取客户名称
   */
  function getClientName(clientId: number | string | undefined): string {
    if (!clientId) return '-';
    const key = String(clientId);
    return labelCache.value.clients.get(key) || `客户(${clientId})`;
  }

  /**
   * 初始化下拉选项（页面加载时调用）
   */
  async function initDropdownSources(defaultCurrencyIdRef: any) {
    try {
      // 加载箱型列表
      const ctns = await getBaseCtnCodes({
        PageIndex: 1,
        PageSize: 1000,
        Sorting: 'OrderNo',
      });

      allCtnOptions.value =
        ctns?.items?.map((item) => ({
          ctnCodeId: item.id,
          ctnName: item.ctnName || '',
        })) || [];

      // 自动添加默认箱型（status为0且isDefault为true）
      const defaultCtns = ctns?.items?.filter(
        (item) => item.status === 0 && item.isDefault === true,
      );

      if (defaultCtns && defaultCtns.length > 0) {
        // 返回默认箱型，由调用者设置到 addedCtnTypes
        console.log('已加载默认箱型:', defaultCtns.length, '个');
      }

      // 加载币别列表，查找 USD 的 ID
      try {
        const currencies = await getCurrencyPagedList({
          PageIndex: 1,
          PageSize: 100,
        });

        const usdCurrency = currencies?.items?.find(
          (item) => item.code?.toUpperCase() === 'USD',
        );

        if (usdCurrency) {
          defaultCurrencyIdRef.value = usdCurrency.id;
          console.log('USD 币别 ID:', defaultCurrencyIdRef.value);
        }

        // 缓存所有币别信息
        currencies.items?.forEach((currency) => {
          if (currency.id) {
            updateLabelCache('currencies', currency.id, currency.code || '');
          }
        });

        console.log(
          `✅ [initDropdownSources] 已缓存 ${currencies?.items?.length || 0} 个币别信息`,
        );
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载币别列表失败:', error);
      }

      // 加载港口列表并缓存所有港口信息
      try {
        const ports = await getPortCodePagedList({
          PageIndex: 1,
          PageSize: 1000,
        });

        // 将所有港口信息存入缓存
        ports?.items?.forEach((port) => {
          if (port.id) {
            const countryEnName = (port.country?.countryEnName ?? '')
              .toString()
              .trim();
            const portName = `${port.portName}/${countryEnName}`;
            updateLabelCache('ports', port.id, portName);
          }
        });

        console.log(
          `✅ [initDropdownSources] 已缓存 ${ports?.items?.length || 0} 个港口信息`,
        );
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载港口列表失败:', error);
      }

      // 加载船公司列表并缓存
      try {
        const carriers = await getCarrierPagedList({
          PageIndex: 1,
          PageSize: 1000,
        });

        carriers?.items?.forEach((carrier) => {
          if (carrier.id) {
            // 优先使用中文简称，其次中文名称，最后英文名称
            const carrierName =
              carrier.cnShortName || carrier.cnName || carrier.enName || '';
            updateLabelCache('carriers', carrier.id, carrierName);
          }
        });

        console.log(
          `✅ [initDropdownSources] 已缓存 ${carriers?.items?.length || 0} 个船公司信息`,
        );
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载船公司列表失败:', error);
      }

      // 加载国家列表并缓存
      try {
        const countries = await getCountryCodePagedList({
          PageIndex: 1,
          PageSize: 1000,
        });

        countries?.items?.forEach((country) => {
          if (country.id) {
            // 使用国家中文名称
            updateLabelCache('clients', country.id, country.countryName || '');
          }
        });

        console.log(
          `✅ [initDropdownSources] 已缓存 ${countries?.items?.length || 0} 个国家信息`,
        );
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载国家列表失败:', error);
      }

      // 输出最终缓存统计
      console.log('📊 [initDropdownSources] 缓存统计:');
      console.log('  - 箱型:', allCtnOptions.value.length);
      console.log('  - 船公司:', labelCache.value.carriers.size);
      console.log('  - 港口:', labelCache.value.ports.size);
      console.log('  - 币别:', labelCache.value.currencies.size);
      console.log('  - 客户/国家:', labelCache.value.clients.size);

      return {
        defaultCtns:
          defaultCtns?.map((item) => ({
            ctnCodeId: item.id,
            ctnName: item.ctnName || '',
          })) || [],
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
