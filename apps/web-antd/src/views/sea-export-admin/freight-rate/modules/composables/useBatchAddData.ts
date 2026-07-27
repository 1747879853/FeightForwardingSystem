import { ref } from 'vue';
import type {
  AddSeFreiPriceInput,
  SeFreiPriceCtnEditDto,
} from '#/api/sea-export/freight-rate-admin';
import { message } from 'ant-design-vue';

/**
 * 批量新增运价 - 数据管理 Composable
 */
export function useBatchAddData() {
  // 表格数据源
  const dataSource = ref<any[]>([]);

  // 选中的行 keys
  const selectedRowKeys = ref<(string | number)[]>([]);

  // 已添加的箱型列表
  const addedCtnTypes = ref<Array<{ ctnCodeId: number; ctnName: string }>>([]);

  // USD 币别 ID（默认值）
  const defaultCurrencyId = ref<number | string | undefined>("USD");

  // 行 key 计数器
  let rowKeyCounter = 0;

  /**
   * 生成唯一行 key
   */
  function generateRowKey(): string {
    return `freight_${Date.now()}_${++rowKeyCounter}`;
  }

  /**
   * 创建默认行数据
   */
  function createDefaultRow(isCopied: boolean = false) {
    return {
      _rowKey: generateRowKey(),
      _isCopied: isCopied,
      recommend: false,
      carrierId: undefined,
      polId: undefined,
      podId: undefined,
      isDirect: true,
      poT1Id: undefined,
      poT2Id: undefined,
      polFreeDays: undefined,
      podFreeDays: undefined,
      poddem: undefined,
      poddet: undefined,
      voyage: '',
      contractNo: '',
      etd: '',
      closeDocTime: '',
      closingTime: '',
      etdDayOfWeek: undefined,
      etdDayTime: '',
      closeDocDayOfWeek: undefined,
      closeDocDayTime: '',
      closingDayOfWeek: undefined,
      closingDayTime: '',
      validTimeStart: '',
      validTimeEnd: '',
      remark: '',
      currencyId: defaultCurrencyId.value,
      bookingAgentId: undefined,
      seFreiPriceCtns: [] as Array<{ ctnCodeId: number; cost?: number }>,
    };
  }

  /**
   * 新增行
   */
  function addRow(count: number = 1) {
    const newRows = [];

    for (let i = 0; i < count; i++) {
      const newRow = createDefaultRow();

      // 如果已经有添加的箱型，为新行初始化这些箱型的空数据
      if (addedCtnTypes.value.length > 0) {
        newRow.seFreiPriceCtns = addedCtnTypes.value.map((ctn) => ({
          ctnCodeId: ctn.ctnCodeId,
          cost: undefined,
        }));
      }

      newRows.push(newRow);
    }

    dataSource.value.push(...newRows);
    message.success(`已新增 ${count} 行`);
  }

  /**
   * 删除选中行
   */
  function deleteSelectedRows() {
    if (selectedRowKeys.value.length === 0) {
      message.warning('请先选择要删除的行');
      return false;
    }

    dataSource.value = dataSource.value.filter(
      (row) => !selectedRowKeys.value.includes(row._rowKey),
    );

    selectedRowKeys.value = [];
    message.success('删除成功');
    return true;
  }

  /**
   * 复制选中行
   */
  function copySelectedRows() {
    const selectedRows = dataSource.value.filter((row) =>
      selectedRowKeys.value.includes(row._rowKey),
    );

    if (selectedRows.length === 0) {
      message.warning('请先选择要复制的行');
      return;
    }

    const newRows = selectedRows.map((row) => ({
      ...JSON.parse(JSON.stringify(row)),
      _rowKey: generateRowKey(),
      _isCopied: true,
    }));

    dataSource.value.push(...newRows);
    message.success(`已复制 ${selectedRows.length} 行`);
  }

  /**
   * 验证表单
   */
  function validateForm(): boolean {
    if (dataSource.value.length === 0) {
      message.warning('请至少添加一行数据');
      return false;
    }

    for (let i = 0; i < dataSource.value.length; i++) {
      const row = dataSource.value[i];
      const rowNum = i + 1;

      if (!row.carrierId) {
        message.warning(`第 ${rowNum} 行：请选择船公司`);
        return false;
      }
      if (!row.polId) {
        message.warning(`第 ${rowNum} 行：请选择起运港`);
        return false;
      }
      if (!row.podId) {
        message.warning(`第 ${rowNum} 行：请选择目的港`);
        return false;
      }
      if (!row.currencyId) {
        message.warning(`第 ${rowNum} 行：请选择币别`);
        return false;
      }
      if (!row.validTimeStart) {
        message.warning(`第 ${rowNum} 行：请选择有效起始日期`);
        return false;
      }
      if (!row.validTimeEnd) {
        message.warning(`第 ${rowNum} 行：请选择有效截止日期`);
        return false;
      }
    }

    return true;
  }

  /**
   * 准备提交数据
   * @param labelToIdMap - 标签到ID的映射表(可选)
   */
  function prepareSubmitData(labelToIdMap?: {
    carriers: Map<string, number>;
    ports: Map<string, number>;
    currencies: Map<string, number>;
    clients: Map<string, number>;
  }): AddSeFreiPriceInput[] {
    return dataSource.value.map((row) => {
      // 构建箱型报价列表 - 只包含已录入运费的箱型
      const seFreiPriceCtns: SeFreiPriceCtnEditDto[] = row.seFreiPriceCtns
        .filter((ctn: any) => ctn.cost !== undefined && ctn.cost !== null)
        .map((ctn: any) => ({
          ctnCodeId: ctn.ctnCodeId,
          cost: ctn.cost,
        }));

      // 构建日期时间模式数据
      const seFreiPriceDays =
        row.etd || row.closeDocTime || row.closingTime
          ? [
              {
                etd: row.etd || undefined,
                closeDocTime: row.closeDocTime || undefined,
                closingTime: row.closingTime || undefined,
              },
            ]
          : [];

      // 构建星期模式数据
      const seFreiPriceWeekDays =
        row.etdDayOfWeek !== undefined ||
        row.closeDocDayOfWeek !== undefined ||
        row.closingDayOfWeek !== undefined
          ? [
              {
                etdDayOfWeek: row.etdDayOfWeek,
                etdDayTime: row.etdDayTime || undefined,
                closeDocDayOfWeek: row.closeDocDayOfWeek,
                closeDocDayTime: row.closeDocDayTime || undefined,
                closingDayOfWeek: row.closingDayOfWeek,
                closingDayTime: row.closingDayTime || undefined,
              },
            ]
          : [];

      // 辅助函数:将名称转换为ID
      const convertNameToId = (
        value: any,
        map?: Map<string, number>,
      ): number | undefined => {
        // 如果已经是数字ID,直接返回
        if (typeof value === 'number') {
          return value;
        }
        // 如果是字符串名称,尝试从映射表中查找ID
        if (typeof value === 'string' && map) {
          return map.get(value);
        }
        return undefined;
      };

      // 转换所有需要ID的字段
      const carrierId = convertNameToId(row.carrierId, labelToIdMap?.carriers);
      const polId = convertNameToId(row.polId, labelToIdMap?.ports);
      const podId = convertNameToId(row.podId, labelToIdMap?.ports);
      const currencyId = convertNameToId(row.currencyId, labelToIdMap?.currencies);
      const poT1Id = convertNameToId(row.poT1Id, labelToIdMap?.ports);
      const poT2Id = convertNameToId(row.poT2Id, labelToIdMap?.ports);
      const bookingAgentId = convertNameToId(row.bookingAgentId,labelToIdMap?.clients); // bookingAgentId 保持原值,不需要转换

      return {
        recommend: row.recommend || false,
        carrierId: carrierId!,
        polId: polId!,
        podId: podId!,
        isDirect: row.isDirect,
        poT1Id,
        poT2Id,
        polFreeDays: row.polFreeDays,
        podFreeDays: row.podFreeDays,
        poddem: row.poddem,
        poddet: row.poddet,
        voyage: row.voyage,
        contractNo: row.contractNo,
        validTimeStart: row.validTimeStart,
        validTimeEnd: row.validTimeEnd,
        remark: row.remark,
        currencyId: currencyId!,
        bookingAgentId: bookingAgentId || null,
        seFreiPriceCtns,
        seFreiPriceFees: [],
        seFreiPriceDays,
        seFreiPriceWeekDays,
      };
    });
  }

  /**
   * 重置数据
   */
  function reset() {
    dataSource.value = [];
    selectedRowKeys.value = [];
    addedCtnTypes.value = [];
    rowKeyCounter = 0;
  }

  return {
    dataSource,
    selectedRowKeys,
    addedCtnTypes,
    defaultCurrencyId,
    generateRowKey,
    createDefaultRow,
    addRow,
    deleteSelectedRows,
    copySelectedRows,
    validateForm,
    prepareSubmitData,
    reset,
  };
}
