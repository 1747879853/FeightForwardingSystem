import type { ReportPageConfig } from './types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';

import { useVbenForm } from '#/adapter/form';

import { message } from 'ant-design-vue';

import { setPortTypeByBizType } from './formatters';
import { buildCurrencyColumns, buildCurrencyNumericKeys } from './hot-columns';
import { transformReportData } from './transform';

/**
 * 报表页面通用逻辑
 * 封装查询表单、数据请求、重置、动态列、列配置等所有报表共有的逻辑，
 * 由配置对象（ReportPageConfig）驱动，实现"一份逻辑，多报表复用"
 *
 * @param config 报表配置（接口、表单、列、数据转换等差异点）
 */
export function useReportPage(config: ReportPageConfig) {
  const router = useRouter();
  // 权限工具通过上下文注入给配置钩子，避免配置文件顶层调用依赖注入 API
  const { hasAccessByCodes } = useAccess();

  // ==================== 状态 ====================

  /** 表格加载状态 */
  const loading = ref(false);
  /** 表格数据（转换后的行数据，供分组/合计使用） */
  const originalData = ref<Record<string, any>[]>([]);
  /** 当前分组的列名数组 */
  const groupColumns = ref<string[]>([]);
  /** 展开的分组键集合 */
  const expandedGroups = ref<Set<string>>(new Set());
  /** 所有出现的币别代码 */
  const allCurrencyCodes = ref<Set<string>>(new Set());
  /** 列显隐与排序配置 */
  const columnConfigs = ref<any[]>([]);

  // ==================== 动态列 ====================

  /** 完整列配置 = 基础列 + 币别明细列（随查询结果动态生成） + 合计列 */
  const dynamicHotColumns = computed(() => [
    ...config.baseHotColumns,
    ...buildCurrencyColumns(
      Array.from(allCurrencyCodes.value),
      config.currencyFields,
    ),
    ...config.totalHotColumns,
  ]);

  /** 数值列键集合 = 配置中的静态数值列 + 动态币别列（用于合计/聚合/右对齐） */
  const numericColumnKeys = computed(() => [
    ...(config.numericColumnKeys ?? []),
    ...buildCurrencyNumericKeys(
      Array.from(allCurrencyCodes.value),
      config.currencyFields,
    ),
  ]);

  /** 根据当前列初始化默认列配置（全部可见，按原始顺序） */
  function initDefaultColumnConfigs() {
    columnConfigs.value = dynamicHotColumns.value.map((col, index) => ({
      data: col.data,
      title: col.title,
      visible: true,
      order: index,
    }));
  }

  // 币别变化会导致列变化，需要同步重建列配置
  watch(dynamicHotColumns, initDefaultColumnConfigs, { immediate: true });

  // ==================== 查询表单 ====================

  const [QueryForm, formApi] = useVbenForm({
    schema: config.formSchema,
    showDefaultActions: true,
    commonConfig: {
      labelWidth: 100,
    },
    wrapperClass: 'grid-cols-5',
    showCollapseButton: true,
    collapsed: true,
    submitButtonOptions: {
      content: '查询',
    },
    resetButtonOptions: {
      content: '重置',
    },
    handleSubmit: async (values) => {
      await handleQuery(values);
    },
    handleReset: async () => {
      await handleReset();
    },
  });

  // ==================== 查询与重置 ====================

  /**
   * 查询报表数据
   * 流程：取值 → beforeQuery 参数加工（可中止） → 请求接口 → 行数据转换 → 渲染
   */
  async function handleQuery(formData?: Record<string, any>) {
    try {
      loading.value = true;
      const values = formData || (await formApi.getValues());

      // 参数预处理：配置了 beforeQuery 则优先使用，否则默认按业务类型设置港口类型
      const processed = config.beforeQuery
        ? await config.beforeQuery({ ...values }, { hasAccessByCodes })
        : setPortTypeByBizType({ ...values });
      // 钩子返回 false 表示中止本次查询（如权限校验未通过）
      if (processed === false) {
        return;
      }

      const result = await config.fetchApi(processed);
      const dataList = result || [];
      const { rows, currencyCodes } = transformReportData(
        dataList,
        config.currencyFields,
        config.mapExtraRow,
      );
      allCurrencyCodes.value = currencyCodes;
      originalData.value = [...rows];
      config.afterQuery?.(rows);
      message.success(`查询成功，共 ${rows.length} 条记录`);
    } catch (error: any) {
      console.error('查询失败:', error);
      message.error('查询失败，请稍后重试');
    } finally {
      loading.value = false;
    }
  }

  /**
   * 重置：恢复页面打开时的初始状态
   * 1. 表单恢复默认值；2. 清空分组/展开/币别等表格状态；
   * 3. 重新执行一次默认查询（与页面首次打开时的行为一致）
   */
  async function handleReset() {
    await formApi.resetForm();
    // 清空表格数据与分组状态，确保表格回到无分组的初始展示
    originalData.value = [];
    groupColumns.value = [];
    expandedGroups.value = new Set();
    // 清空币别会触发动态列重建，列配置（显隐/顺序）随之恢复默认；
    // 此处再显式初始化一次，兼容重置后无币别数据时列配置不回退的情况
    allCurrencyCodes.value = new Set();
    initDefaultColumnConfigs();
    // 按重置后的默认表单值重新查询，回到页面打开时的状态
    await handleQuery();
  }

  // 页面加载时默认执行一次查询（延迟执行，确保表单已初始化）
  onMounted(() => {
    setTimeout(() => {
      handleQuery();
    }, 100);
  });

  // ==================== 详情跳转 ====================

  /**
   * 跳转到业务详情（各报表通用：按业务类型路由到对应编辑页）
   */
  function handleViewDetail(record: any) {
    if (!record || !record.transportOrderId) {
      message.warning('该记录没有关联的业务订单，无法跳转详情');
      return;
    }

    const bizType = record.transportOrder?.bizType ?? 0;
    const bizTypeMap: Record<number, string> = {
      0: 'sea-exports',
      1: 'sea-imports',
      2: 'air-exports',
    };
    const basePath = bizTypeMap[bizType];
    if (!basePath) {
      message.warning('不支持的业务类型，无法跳转详情');
      return;
    }

    router.push({
      path: `/${basePath}/${record.transportOrderId}/edit`,
    });
  }

  return {
    /** 查询表单组件 */
    QueryForm,
    /** 查询表单 API */
    formApi,
    loading,
    originalData,
    groupColumns,
    expandedGroups,
    allCurrencyCodes,
    columnConfigs,
    /** 完整动态列（供表格渲染） */
    dynamicHotColumns,
    /** 数值列键集合（供表格合计/聚合） */
    numericColumnKeys,
    handleQuery,
    handleReset,
    handleViewDetail,
  };
}
