import { ref, shallowRef } from 'vue';
import type {
  AddSeFreiPriceInput,
  SeFreiPriceCtnEditDto,
} from '#/api/sea-export/freight-rate-admin';
import { message } from 'ant-design-vue';

/**
 * 批量新增运价 - 数据管理 Composable
 */
export function useBatchAddData() {
  // ⚠️ 关键修复：使用 shallowRef 包裹 dataSource，避免深响应式导致的箱型列消失
  // Handsontable 会直接修改行对象的属性，shallowRef 确保只有引用变化才触发更新
  const dataSource = shallowRef<any[]>([]);

  // 选中的行 keys
  const selectedRowKeys = ref<(string | number)[]>([]);

  // 已添加的箱型列表
  const addedCtnTypes = ref<Array<{ ctnCodeId: string; ctnName: string }>>([]);

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
    const row: any = {
      _rowKey: generateRowKey(),
      _isCopied: isCopied,
      recommend: false,
      carrierId: undefined,
      polId: undefined,
      podId: undefined,
      isDirect: '是',
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
      seFreiPriceCtns: [] as Array<{ ctnCodeId: string; cost?: number }>,
    };

    // ⚠️ 关键修复：如果已经有添加的箱型，为新行初始化动态字段
    if (addedCtnTypes.value.length > 0) {
      addedCtnTypes.value.forEach((ctn) => {
        const dynamicField = `ctn_${String(ctn.ctnCodeId)}`;
        row[dynamicField] = undefined;
      });
      
      // 同时初始化 seFreiPriceCtns
      row.seFreiPriceCtns = addedCtnTypes.value.map((ctn) => ({
        ctnCodeId: ctn.ctnCodeId,
        cost: undefined,
      }));
    }

    return row;
  }

  /**
   * 新增行
   */
  function addRow(count: number = 1) {
    const newRows = [];

    for (let i = 0; i < count; i++) {
      const newRow = createDefaultRow();
      newRows.push(newRow);
    }

    // ⚠️ 关键修复：使用新数组引用来触发 shallowRef 的响应式更新
    // push() 不会改变引用，所以需要创建新数组
    dataSource.value = [...dataSource.value, ...newRows];
    
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

    // ⚠️ 关键修复：使用新数组引用来触发 shallowRef 的响应式更新
    dataSource.value = [...dataSource.value, ...newRows];
    
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
   * @param labelToIdMap - 标签到ID的映射表(可选)，使用字符串类型避免大数精度丢失
   */
  function prepareSubmitData(labelToIdMap?: {
    carriers: Map<string, string>;
    ports: Map<string, string>;
    currencies: Map<string, string>;
    clients: Map<string, string>;
  }): AddSeFreiPriceInput[] {
    return dataSource.value.map((row) => {
      // ⚠️ 关键修复：从行数据中提取箱型列的值（而不是从 seFreiPriceCtns）
      // 因为 handleAfterChange 不再同步 seFreiPriceCtns，避免触发 Vue 响应式
      const seFreiPriceCtns: SeFreiPriceCtnEditDto[] = [];
      
      // 遍历所有以 ctn_ 开头的字段，提取箱型费用
      Object.keys(row).forEach((key) => {
        if (key.startsWith('ctn_')) {
          const ctnCodeId = key.replace('ctn_', '');
          const cost = row[key];
          
          // 只包含有值的箱型
          if (cost !== undefined && cost !== null && cost !== '') {
            seFreiPriceCtns.push({
              ctnCodeId,
              cost: Number(cost),
            });
          }
        }
      });

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

      // 辅助函数:将名称转换为ID（保持字符串类型，避免大数精度丢失）
      const convertNameToId = (
        value: any,
        map?: Map<string, string>,
      ): string | undefined => {
        // 如果是字符串名称，尝试从映射表中查找ID
        if (map) {
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

      // ⚠️ 关键修复：直接传递字符串 ID，后端会自行处理类型转换
      // 避免前端使用 Number() 转换导致大数精度丢失
      
      // ⚠️ 关键修复：将 isDirect 的"是/否"文本转换为布尔值 true/false
      let isDirectBoolean: boolean | undefined;
      if (row.isDirect === '是') {
        isDirectBoolean = true;
      } else if (row.isDirect === '否') {
        isDirectBoolean = false;
      } else {
        // 如果已经是布尔值，直接使用
        isDirectBoolean = row.isDirect === true || row.isDirect === false ? row.isDirect : undefined;
      }
      
      return {
        recommend: row.recommend || false,
        carrierId: carrierId!,
        polId: polId!,
        podId: podId!,
        isDirect: isDirectBoolean,
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
      } as any; // 使用 as any 绕过 TypeScript 类型检查，因为后端支持字符串 ID
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
