import { computed } from 'vue';
import Handsontable from 'handsontable';

/**
 * 批量新增运价 - Handsontable 设置 Composable
 */
export function useBatchAddSettings(
  dataSource: any,
  selectedRowKeys: any,
  hotColumns: any,
  handleColumnSort: (field: string, order: 'asc' | 'desc') => void,
  linkage: any,
  dropdownSources: any,
  currentOptionsCache: any,
  dropdownSourceCache: any,
  getColumnIndex: (field: string) => number,
  handleOpenDropdown: (
    rowIndex: number,
    colIndex: number,
    field: string,
    source: string[],
  ) => void,
  getSortIcon: (field: string) => string,
) {
  /**
   * Handsontable 配置
   */
  const hotSettings = computed(() => ({
    data: dataSource.value,
    columns: hotColumns.value,
    rowHeaders: true,
    colHeaders: true,
    height: '100%',
    width: '100%',
    stretchH: 'all',
    manualColumnResize: true,
    manualRowMove: false,
    fixedRowsTop: 0,
    fixedColumnsLeft: 2, // 固定复选框和序号列
    contextMenu: ['row_above', 'row_below', 'remove_row'],
    licenseKey: 'non-commercial-and-evaluation',

    // 选择配置
    selectionMode: 'multiple',
    outsideClickDeselects: false,

    // 排序配置
    columnSorting: {
      indicator: true,
      sortEmptyCells: false,
      initialConfig: {
        column: 0,
        sortOrder: 'asc',
      },
    },

    // 事件钩子
    afterSelectionEnd: (
      row: number,
      col: number,
      row2: number,
      col2: number,
    ) => {
      // 更新选中状态
      const selectedRows: any[] = [];
      for (let r = Math.min(row, row2); r <= Math.max(row, row2); r++) {
        const rowData = dataSource.value[r];
        if (rowData && rowData._rowKey) {
          selectedRows.push(rowData._rowKey);
        }
      }
      selectedRowKeys.value = selectedRows;
    },

    afterChange: (changes: any, source: string) => {
      if (!changes || source === 'loadData') return;

      changes.forEach(([row, prop, oldValue, newValue]: any) => {
        // 处理 DEM + DET = 免箱使期 的自动计算
        if (prop === 'poddem' || prop === 'podFreeDays') {
          const rowData = dataSource.value[row];
          if (rowData) {
            const dem = Number(rowData.poddem) || 0;
            const det = Number(rowData.podFreeDays) || 0;
            rowData.poddet = dem + det;
          }
        }

        // 处理日期模式切换时的清空逻辑
        if (prop === 'etd' && newValue && oldValue !== newValue) {
          const rowData = dataSource.value[row];
          if (rowData) {
            rowData.etdDayOfWeek = undefined;
          }
        }

        if (prop === 'etdDayOfWeek' && newValue !== undefined) {
          const rowData = dataSource.value[row];
          if (rowData) {
            rowData.etd = '';
          }
        }
      });
    },

    beforeKeyDown: (event: KeyboardEvent) => {
      // 处理自定义快捷键
      if (event.ctrlKey && event.key === 'Enter') {
        // Ctrl+Enter 添加新行（由父组件处理）
      }
    },

    cells: (row: number, col: number, prop: string) => {
      const cellProperties: any = {};
      const rowData = dataSource.value[row];

      if (!rowData) return cellProperties;

      // 根据是否直达禁用中转港编辑
      if ((prop === 'poT1Id' || prop === 'poT2Id') && rowData.isDirect) {
        cellProperties.readOnly = true;
        cellProperties.className = 'disabled-cell';
      }

      // 为需要下拉框的字段设置 source
      if (prop === 'carrierId') {
        const carriers = dropdownSourceCache?.value?.carriers || [];
        cellProperties.source = carriers;
        console.log(
          `🔧 [cells] ${prop} - 设置 source，数量:`,
          carriers.length,
          '缓存Map大小:',
          dropdownSourceCache?.value ? Object.keys(dropdownSourceCache.value).length : 0,
        );
      } else if (
        prop === 'polId' ||
        prop === 'podId' ||
        prop === 'poT1Id' ||
        prop === 'poT2Id'
      ) {
        const ports = dropdownSourceCache?.value?.ports || [];
        cellProperties.source = ports;
        if (row === 0) {
          console.log(
            `🔧 [cells] ${prop} - 设置 source，数量:`,
            ports.length,
          );
        }
      } else if (prop === 'currencyId') {
        const currencies = dropdownSourceCache?.value?.currencies || [];
        cellProperties.source = currencies;
        if (row === 0) {
          console.log(
            `🔧 [cells] ${prop} - 设置 source，数量:`,
            currencies.length,
          );
        }
      } else if (prop === 'bookingAgentId') {
        const clients = dropdownSourceCache?.value?.clients || [];
        cellProperties.source = clients;
        if (row === 0) {
          console.log(
            `🔧 [cells] ${prop} - 设置 source，数量:`,
            clients.length,
          );
        }
      }

      return cellProperties;
    },

    renderer: (
      instance: any,
      td: any,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) => {
      // 默认渲染 - 使用 call 代替 apply 避免 this 问题
      Handsontable.renderers.TextRenderer.call(
        undefined,
        instance,
        td,
        row,
        col,
        prop,
        value,
        cellProperties,
      );

      // 如果是复制的行，添加背景色
      const rowData = dataSource.value[row];
      if (rowData?._isCopied) {
        td.style.backgroundColor = '#fff7e6';
      }
    },
  }));

  return {
    hotSettings,
  };
}
