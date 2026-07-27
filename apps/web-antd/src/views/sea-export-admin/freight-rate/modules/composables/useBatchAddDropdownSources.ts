import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { getCtnCodePagedList as getBaseCtnCodes } from '#/api/system/base-data/ctn-code-admin';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';
import { getPortCodeList, getPortCodePagedList } from '#/api/system/base-data/port-code-admin';
import { getCarrierPagedList } from '#/api/system/base-data/carrier-admin';
import { getClientGroupedByIndustryCategory } from '#/api/common/client';

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
    return labelCache.value.carriers.get(key) || `${carrierId}`;
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
    return labelCache.value.currencies.get(key) || `${currencyId}`;
  }

  /**
   * 获取客户名称
   */
  function getClientName(clientId: number | string | undefined): string {
    if (!clientId) return '-';
    const key = String(clientId);
    return labelCache.value.clients.get(key) || `${clientId}`;
  }

  /**
   * 初始化下拉选项（页面加载时调用）
   */
  async function initDropdownSources(defaultCurrencyIdRef: any) {
    console.log('🚀 [initDropdownSources] 开始初始化下拉框数据源...');
    try {
      // 加载箱型列表
      console.log('📦 [initDropdownSources] 正在加载箱型列表...');
      const ctns = await getBaseCtnCodes({
        PageIndex: 1,
        PageSize: 1000,
        Sorting: 'OrderNo',
      });
      console.log('📦 [initDropdownSources] 箱型API响应:', ctns);

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
        console.log('💰 [initDropdownSources] 正在加载币别列表...');
        const currencies = await getCurrencyPagedList({
          PageIndex: 1,
          PageSize: 100,
        });
        console.log('💰 [initDropdownSources] 币别API响应:', currencies);

        // const usdCurrency = currencies?.items?.find(
        //   (item) => item.code?.toUpperCase() === 'USD',
        // );

        // if (usdCurrency) {
        //   defaultCurrencyIdRef.value = usdCurrency.id;
        //   console.log('USD 币别 ID:', defaultCurrencyIdRef.value);
        // }

        // 缓存所有币别信息
        currencies.items?.forEach((currency) => {
          if (currency.id) {
            updateLabelCache('currencies', currency.id, currency.code || '');
          }
        });

        console.log(
          `✅ [initDropdownSources] 已缓存 ${currencies?.items?.length || 0} 个币别信息`,
        );
        console.log('💰 [initDropdownSources] 当前 currencies 缓存大小:', labelCache.value.currencies.size);
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载币别列表失败:', error);
      }

      // 加载港口列表并缓存所有港口信息
      try {
        console.log('🚢 [initDropdownSources] 正在加载港口列表（使用精简接口）...');
        const ports = await getPortCodeList();
        console.log('🚢 [initDropdownSources] 港口API响应:', ports);

        // 将所有港口信息存入缓存（新接口使用单字母字段：i=id, p=portName, c=cnName, e=countryEnName）
        ports?.forEach((port) => {
          if (port.i) {
            const countryEnName = (port.e ?? '').toString().trim();
            const portName = `${port.p}/${countryEnName}`;
            updateLabelCache('ports', port.i, portName);
          }
        });

        console.log(
          `✅ [initDropdownSources] 已缓存 ${ports?.length || 0} 个港口信息`,
        );
        console.log('🚢 [initDropdownSources] 当前 ports 缓存大小:', labelCache.value.ports.size);
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载港口列表失败:', error);
      }

      // 加载船公司列表并缓存
      try {
        console.log('🏢 [initDropdownSources] 正在加载船公司列表...');
        const carriers = await getCarrierPagedList({
          PageIndex: 1,
          PageSize: 1000,
        });
        console.log('🏢 [initDropdownSources] 船公司API响应:', carriers);

        carriers?.items?.forEach((carrier) => {
          if (carrier.id) {
            // 格式：code(cnShortName)
            const code = carrier.code || '';
            const cnShortName = carrier.cnShortName || carrier.cnName || carrier.enName || '';
            const carrierName = code && cnShortName ? `${code}(${cnShortName})` : (cnShortName || code);
            updateLabelCache('carriers', carrier.id, carrierName);
          }
        });

        console.log(
          `✅ [initDropdownSources] 已缓存 ${carriers?.items?.length || 0} 个船公司信息`,
        );
        console.log('🏢 [initDropdownSources] 当前 carriers 缓存大小:', labelCache.value.carriers.size);
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载船公司列表失败:', error);
      }

      // 加载订舱代理列表并缓存（行业类型为 'o' 的客户）
      try {
        console.log('👥 [initDropdownSources] 正在加载订舱代理列表...');
        const clientGroups = await getClientGroupedByIndustryCategory();
        console.log('👥 [initDropdownSources] 订舱代理API响应:', clientGroups);

        // 过滤出行业类型为 'o' 的客户（订舱代理）
        const bookingAgentGroup = clientGroups?.find(
          (group) => group.key === 'o',
        );

        if (bookingAgentGroup && bookingAgentGroup.value) {
          // 将订舱代理信息存入缓存
          bookingAgentGroup.value.forEach((client) => {
            if (client.id) {
              // 优先使用客户简称，其次客户全称
              const clientName = client.name || client.fullName || '';
              updateLabelCache('clients', client.id, clientName);
            }
          });

          console.log(
            `✅ [initDropdownSources] 已缓存 ${bookingAgentGroup.value.length} 个订舱代理信息`,
          );
        } else {
          console.warn('⚠️ [initDropdownSources] 未找到行业类型为 "o" 的订舱代理数据');
        }

        console.log('👥 [initDropdownSources] 当前 clients 缓存大小:', labelCache.value.clients.size);
      } catch (error) {
        console.error('❌ [initDropdownSources] 加载订舱代理列表失败:', error);
      }

      // 输出最终缓存统计
      console.log('📊 [initDropdownSources] 缓存统计:');
      console.log('  - 箱型:', allCtnOptions.value.length);
      console.log('  - 船公司:', labelCache.value.carriers.size);
      console.log('  - 港口:', labelCache.value.ports.size);
      console.log('  - 币别:', labelCache.value.currencies.size);
      console.log('  - 订舱代理:', labelCache.value.clients.size);

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
