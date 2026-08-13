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
    // ⚠️ 关键修复：恢复 data 属性，让 Handsontable 直接使用 dataSource 作为数据源
    // 这样用户编辑的值会自动同步到 dataSource.value[row][field]
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
    fixedColumnsLeft: 0, // 不默认固定任何列
    contextMenu: ['row_above', 'row_below', 'remove_row'],
    licenseKey: 'non-commercial-and-evaluation',
    enterMoves: { row: 0, col: 1 },
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

    afterChange: function (this: any, changes: any, source: string) {
      if (!changes || source === 'loadData') return;

      // ⚠️ 关键修复：获取 hotInstance，使用其 API 更新数据，避免触发 Vue 响应式
      const hotInstance = this; // afterChange 中的 this 指向 hotInstance

      changes.forEach(([row, prop, oldValue, newValue]: any) => {
        // ✅ 处理 isDirect 变化时的中转港单元格刷新
        if (prop === 'isDirect') {
          // 强制刷新中转港1和中转港2的单元格配置
          const poT1ColIndex = hotInstance.propToCol('poT1Id');
          const poT2ColIndex = hotInstance.propToCol('poT2Id');

          if (poT1ColIndex >= 0) {
            hotInstance.setCellMeta(row, poT1ColIndex, 'readOnly', null);
            hotInstance.setCellMeta(row, poT1ColIndex, 'className', null);
          }

          if (poT2ColIndex >= 0) {
            hotInstance.setCellMeta(row, poT2ColIndex, 'readOnly', null);
            hotInstance.setCellMeta(row, poT2ColIndex, 'className', null);
          }

          // 重新渲染这两个单元格，让 cells 函数重新应用配置
          hotInstance.render();
        }

        // 处理 DEM + DET = 免箱使期 的自动计算
        if (prop === 'poddem' || prop === 'podFreeDays') {
          // 使用 hotInstance.getDataAtCell 获取当前值，而不是直接访问 dataSource
          const dem =
            Number(
              hotInstance.getDataAtCell(row, hotInstance.propToCol('poddem')),
            ) || 0;
          const det =
            Number(
              hotInstance.getDataAtCell(
                row,
                hotInstance.propToCol('podFreeDays'),
              ),
            ) || 0;
          const poddet = dem + det;

          // 使用 setDataAtCell 更新，避免触发 Vue 响应式
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('poddet'),
            poddet,
          );
        }

        // 处理日期模式切换时的清空逻辑
        if (prop === 'etd' && newValue) {
          // 使用 setDataAtCell 清空开船星期和时间点
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('etdDayOfWeek'),
            undefined,
          );
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('etdDayTime'),
            undefined,
          );
        }

        if (prop === 'etdDayOfWeek' && newValue !== undefined) {
          // 使用 setDataAtCell 清空开船日期
          hotInstance.setDataAtCell(row, hotInstance.propToCol('etd'), '');
        } else if (prop === 'etdDayTime' && newValue) {
          // 如果输入了开船时间点，也视为切换到星期模式（如果需要互斥）
          // 这里假设只要输入了星期或时间点中的任何一个，都清空具体日期
          hotInstance.setDataAtCell(row, hotInstance.propToCol('etd'), '');
        }

        // 截单时间互斥逻辑
        if (prop === 'closeDocTime' && newValue) {
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closeDocDayOfWeek'),
            undefined,
          );
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closeDocDayTime'),
            undefined,
          );
        }

        if (prop === 'closeDocDayOfWeek' && newValue !== undefined) {
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closeDocTime'),
            '',
          );
        } else if (prop === 'closeDocDayTime' && newValue) {
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closeDocTime'),
            '',
          );
        }

        // 截关时间互斥逻辑
        if (prop === 'closingTime' && newValue) {
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closingDayOfWeek'),
            undefined,
          );
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closingDayTime'),
            undefined,
          );
        }

        if (prop === 'closingDayOfWeek' && newValue !== undefined) {
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closingTime'),
            '',
          );
        } else if (prop === 'closingDayTime' && newValue) {
          hotInstance.setDataAtCell(
            row,
            hotInstance.propToCol('closingTime'),
            '',
          );
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

      // ✅ 修复：明确判断是否为直达（字符串"是"或布尔值true）
      const isDirectValue =
        rowData.isDirect === '是' || rowData.isDirect === true;

      // 根据是否直达禁用中转港编辑
      if ((prop === 'poT1Id' || prop === 'poT2Id') && isDirectValue) {
        cellProperties.readOnly = true;
        cellProperties.className = 'disabled-cell';
      }

      // 为需要下拉框的字段设置 source
      if (prop === 'carrierId') {
        const carriers = dropdownSourceCache?.value?.carriers || [];
        cellProperties.source = carriers;
      } else if (
        prop === 'polId' ||
        prop === 'podId' ||
        prop === 'poT1Id' ||
        prop === 'poT2Id'
      ) {
        const ports = dropdownSourceCache?.value?.ports || [];
        cellProperties.source = ports;
      } else if (prop === 'currencyId') {
        const currencies = dropdownSourceCache?.value?.currencies || [];
        cellProperties.source = currencies;
      } else if (prop === 'bookingAgentId') {
        const clients = dropdownSourceCache?.value?.clients || [];
        cellProperties.source = clients;
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
