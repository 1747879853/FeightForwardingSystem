import type { ReportPageConfig } from './types';

import { computed, nextTick, onMounted, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';

import { useVbenForm } from '#/adapter/form';
import { loadMaskedFields } from '#/composables/use-masked-fields';

import { message } from 'ant-design-vue';

import { filterMaskedColumns, getMaskedFormFields } from './field-permission';
import { setPortTypeByBizType } from './formatters';
import { buildCurrencyColumns, buildCurrencyNumericKeys } from './hot-columns';
import { transformReportData } from './transform';
import {
  type ReportColumnPersistSetting,
  useReportColumnPersist,
} from './use-report-column-persist';

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
  const loading = shallowRef(false);
  /**
   * 表格数据（转换后的行数据，供分组/合计使用）。
   * 全量报表行只整体替换，用 shallowRef 避免对上千行做深层代理。
   */
  const originalData = shallowRef<Record<string, any>[]>([]);
  /** 当前分组的列名数组 */
  const groupColumns = shallowRef<string[]>([]);
  /** 展开的分组键集合 */
  const expandedGroups = shallowRef<Set<string>>(new Set());
  /** 所有出现的币别代码 */
  const allCurrencyCodes = shallowRef<Set<string>>(new Set());
  /** 列显隐与排序配置 */
  const columnConfigs = shallowRef<any[]>([]);
  /** 右键隐藏的列 data 键（与 Handsontable HiddenColumns 同步，可持久化） */
  const hiddenColumnKeys = shallowRef<string[]>([]);

  const { loadColumnPersist, saveColumnPersist, clearColumnPersist } =
    useReportColumnPersist(() => config.tableId);

  /** 已加载的用户列偏好（币别动态列变化时反复合并，避免冲掉用户隐藏/顺序） */
  let persistedSetting: ReportColumnPersistSetting | null = null;
  let persistReady = false;
  let persistSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // ==================== 动态列 ====================

  /** 完整列配置 = 基础列 + 币别明细列（随查询结果动态生成） + 合计列 */
  const allHotColumns = computed(() => [
    ...config.baseHotColumns,
    ...buildCurrencyColumns(
      Array.from(allCurrencyCodes.value),
      config.currencyFields,
    ),
    ...config.totalHotColumns,
  ]);

  /**
   * 应用字段级权限后的列配置（供表格渲染）。
   * 只隐藏「所有数据来源都被无条件屏蔽」的列；条件屏蔽的列保留，
   * 由行转换阶段逐行以 *** 覆盖（见 field-permission.ts）
   */
  const dynamicHotColumns = computed(() =>
    filterMaskedColumns(allHotColumns.value),
  );

  /** 数值列键集合 = 配置中的静态数值列 + 动态币别列（用于合计/聚合/右对齐） */
  const numericColumnKeys = computed(() => [
    ...(config.numericColumnKeys ?? []),
    ...buildCurrencyNumericKeys(
      Array.from(allCurrencyCodes.value),
      config.currencyFields,
    ),
  ]);

  /**
   * 按当前动态列重建 columnConfigs，并合并用户持久化偏好。
   * 新出现的币别列（不在历史配置里）默认可见，追加在末尾。
   */
  function initDefaultColumnConfigs() {
    const visibility = persistedSetting?.columnVisibility;
    const fixedMap = persistedSetting?.columnFixed;
    const orderList = persistedSetting?.columnOrder;
    const orderIndex = new Map<string, number>();
    orderList?.forEach((key, index) => {
      orderIndex.set(key, index);
    });

    const hiddenSet = new Set(persistedSetting?.hiddenColumnKeys ?? []);
    const built = dynamicHotColumns.value.map((col, index) => {
      const key = String(col.data ?? '');
      const savedOrder = orderIndex.get(key);
      return {
        ...col,
        // 列留在表格里，显隐交给 Handsontable hiddenColumns，右键才能再显示
        visible: true,
        fixed: fixedMap?.[key] ?? col.fixed ?? false,
        // 无历史顺序时保持默认 index；有则用保存的顺序，未知列靠后
        order: savedOrder ?? index + (orderList?.length ?? 0),
      };
    });

    if (orderList && orderList.length > 0) {
      built.sort((a, b) => a.order - b.order);
      built.forEach((col, index) => {
        col.order = index;
      });
    }

    columnConfigs.value = built;

    // 隐藏列与持久化同步：列配置里 visible:false 与 hiddenColumnKeys 合并
    if (persistedSetting) {
      const known = new Set(built.map((col) => String(col.data ?? '')));
      const fromVisibility = Object.entries(visibility ?? {})
        .filter(([, value]) => value === false)
        .map(([key]) => key);
      hiddenColumnKeys.value = [
        ...new Set([
          ...(persistedSetting.hiddenColumnKeys ?? []),
          ...fromVisibility,
        ]),
      ].filter((key) => known.has(key));
    }
  }

  // 币别变化会导致列变化，需要同步重建列配置（合并用户偏好，不整表冲掉）
  watch(dynamicHotColumns, initDefaultColumnConfigs, { immediate: true });

  function schedulePersistSave(patch: Partial<ReportColumnPersistSetting>) {
    if (!persistReady) return;
    if (persistSaveTimer) {
      clearTimeout(persistSaveTimer);
    }
    persistSaveTimer = setTimeout(() => {
      persistSaveTimer = null;
      void saveColumnPersist(patch).catch((error) => {
        console.error('保存报表列配置失败:', error);
      });
    }, 300);
  }

  function buildPersistPatchFromColumnConfigs(
    columns: any[],
  ): Partial<ReportColumnPersistSetting> {
    const sorted = [...columns].sort(
      (a, b) => (a.order ?? 999) - (b.order ?? 999),
    );
    const columnOrder: string[] = [];
    const columnVisibility: Record<string, boolean> = {};
    const columnFixed: Record<string, 'left' | 'right' | false> = {};

    sorted.forEach((col) => {
      const key = String(col.data ?? '').trim();
      if (!key) return;
      columnOrder.push(key);
      columnVisibility[key] = col.visible !== false;
      columnFixed[key] =
        col.fixed === 'left' || col.fixed === 'right' ? col.fixed : false;
    });

    return {
      columnOrder,
      columnVisibility,
      columnFixed,
      hiddenColumnKeys: [...hiddenColumnKeys.value],
    };
  }

  function handleColumnConfigsUpdate(next: any[]) {
    columnConfigs.value = next;
    const hidden = next
      .filter((col) => col?.visible === false && col?.data)
      .map((col) => String(col.data));
    hiddenColumnKeys.value = hidden;
    const patch = buildPersistPatchFromColumnConfigs(next);
    patch.hiddenColumnKeys = hidden;
    persistedSetting = {
      ...(persistedSetting ?? { hiddenColumnKeys: [] }),
      ...patch,
      hiddenColumnKeys: hidden,
    };
    schedulePersistSave(patch);
  }

  function handleHiddenColumnKeysUpdate(keys: string[]) {
    hiddenColumnKeys.value = keys;
    const hiddenSet = new Set(keys);
    // 与 Handsontable HiddenColumns 同步：隐藏键同时反映到 visible，供导出/分组过滤
    columnConfigs.value = columnConfigs.value.map((col) => ({
      ...col,
      visible: col?.data ? !hiddenSet.has(String(col.data)) : col.visible,
    }));
    if (persistedSetting) {
      persistedSetting = {
        ...persistedSetting,
        hiddenColumnKeys: [...keys],
        columnVisibility: Object.fromEntries(
          columnConfigs.value
            .filter((col) => col?.data)
            .map((col) => [String(col.data), col.visible !== false]),
        ),
        columnOrder: [...columnConfigs.value]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((col) => String(col.data))
          .filter(Boolean),
      };
    } else {
      persistedSetting = { hiddenColumnKeys: [...keys] };
    }
    schedulePersistSave({
      hiddenColumnKeys: [...keys],
      columnVisibility: persistedSetting.columnVisibility,
      columnOrder: persistedSetting.columnOrder,
    });
  }

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
    // 与 VXE 列表查询一致：折叠切换后触发 resize，驱动 Handsontable 重算高度
    collapseTriggerResize: true,
    handleCollapsedChange: () => {
      // 再补一发：form-actions 已 triggerWindowResize，这里延后一帧防止量到旧布局
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    },
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

  /** 查询表单的字段权限是否已应用（只需移除一次筛选项） */
  let formPermissionApplied = false;

  /**
   * 确保字段级权限规则已就绪，并移除无权使用的查询筛选项。
   * 必须在行数据转换前完成，否则 applyFieldMask 拿不到规则（fail-open 会漏打 ***）
   */
  async function ensureFieldPermission() {
    await loadMaskedFields();
    if (formPermissionApplied) return;
    formPermissionApplied = true;

    const maskedFieldNames = getMaskedFormFields(config.formSchema);
    if (maskedFieldNames.length > 0) {
      await formApi.removeSchemaByFields(maskedFieldNames);
    }
  }

  /**
   * 查询报表数据
   * 流程：取值 → beforeQuery 参数加工（可中止） → 请求接口 → 行数据转换 → 渲染
   */
  async function handleQuery(formData?: Record<string, any>) {
    // 防连点：进行中的查询未完成前忽略后续触发
    if (loading.value) return;

    try {
      loading.value = true;
      formApi.setState({
        submitButtonOptions: { loading: true },
        resetButtonOptions: { disabled: true },
      });

      await ensureFieldPermission();
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
      originalData.value = rows;
      config.afterQuery?.(rows);
      if (rows.length === 0) {
        message.info('未查询到数据');
      }
    } catch (error: any) {
      console.error('查询失败:', error);
      message.error('查询失败，请稍后重试');
    } finally {
      loading.value = false;
      formApi.setState({
        submitButtonOptions: { loading: false },
        resetButtonOptions: { disabled: false },
      });
    }
  }

  /**
   * 重置：恢复页面打开时的初始状态
   * 1. 表单恢复默认值；2. 清空分组/展开/币别等表格状态；
   * 3. 清除并持久化默认列配置；4. 重新执行一次默认查询
   */
  async function handleReset() {
    await formApi.resetForm();
    // 清空表格数据与分组状态，确保表格回到无分组的初始展示
    originalData.value = [];
    groupColumns.value = [];
    expandedGroups.value = new Set();
    // 清空币别会触发动态列重建；先清用户偏好再 init，回到产品默认列
    allCurrencyCodes.value = new Set();
    persistedSetting = null;
    hiddenColumnKeys.value = [];
    initDefaultColumnConfigs();
    void clearColumnPersist().catch((error) => {
      console.error('清除报表列配置失败:', error);
    });
    // 按重置后的默认表单值重新查询，回到页面打开时的状态
    await handleQuery();
  }

  // 先拉列配置再首查，避免首屏用默认列闪一下再被用户配置覆盖
  onMounted(() => {
    void (async () => {
      try {
        const loaded = await loadColumnPersist();
        persistedSetting = loaded;
        initDefaultColumnConfigs();
      } catch (error) {
        console.error('加载报表列配置失败:', error);
      } finally {
        persistReady = true;
        await nextTick();
        await handleQuery();
      }
    })();
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
      3: 'break-bulks',
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
    hiddenColumnKeys,
    /** 完整动态列（供表格渲染） */
    dynamicHotColumns,
    /** 数值列键集合（供表格合计/聚合） */
    numericColumnKeys,
    handleQuery,
    handleReset,
    handleViewDetail,
    handleColumnConfigsUpdate,
    handleHiddenColumnKeysUpdate,
  };
}
