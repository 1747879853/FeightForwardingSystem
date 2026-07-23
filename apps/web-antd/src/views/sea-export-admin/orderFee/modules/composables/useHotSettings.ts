import { shallowRef, nextTick, type Ref } from 'vue';
import { message } from 'ant-design-vue';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { getFeeStatusOptions } from '../../data';

export function useHotSettings(
  dataSource: Ref<any[]> | any[],
  selectedRowKeys: (string | number)[] | Ref<(string | number)[]>,
  hotColumns: any,
  sortableFieldsSet: any,
  handleColumnSort: (field: string, data: any[]) => void,
  linkage: any,
  dropdownSources: any,
  currentOptionsCache: any,
  loadClientList: (industryCategory: string) => Promise<any[]>,
  getColumnIndex: (field: string) => number,
  getSettlementIndustryCategory: (
    industryCategory?: number,
  ) => string | undefined,
  onOpenDropdown?: (
    rowIndex: number,
    colIndex: number,
    field: string,
    source: string[],
  ) => void,
  getSortIcon?: (field: string) => string,
) {
  const getDataSource = () =>
    Array.isArray(dataSource) ? dataSource : dataSource.value;
  const getSelectedRowKeys = () =>
    Array.isArray(selectedRowKeys) ? selectedRowKeys : selectedRowKeys.value;

  const hotSettings = shallowRef({
    data: getDataSource(),
    imeFastEdit: true,
    columns: hotColumns.value,
    rowHeaders: false,
    colHeaders: function (colIndex: number) {
      const columns = hotColumns.value;
      if (!columns || !Array.isArray(columns) || !columns[colIndex]) {
        return '';
      }

      const column = columns[colIndex];
      let title = column.title || '';

      if (
        getSortIcon &&
        column.data &&
        sortableFieldsSet.value.has(column.data)
      ) {
        const sortIcon = getSortIcon(column.data);
        if (sortIcon) {
          title = `${title} ${sortIcon}`;
        }
      }

      return title;
    },
    height: 458,
    licenseKey: 'non-commercial-and-evaluation',
    columnSorting: {
      indicator: false,
      headerAction: false,
    },
    contextMenu: true,
    manualColumnResize: true,
    manualRowMove: false,
    stretchH: 'all',
    autoRowSize: false,
    autoColumnSize: false,
    renderAllRows: false,

    afterOnCellMouseDown: function (
      this: any,
      event: MouseEvent,
      coords: any,
      td: HTMLTableCellElement,
    ) {
      const columnIndex = coords.col;
      const rowIndex = coords.row;

      // 处理列头点击排序
      if (rowIndex === -1 && columnIndex >= 0) {
        const columns = hotColumns.value;
        if (!columns || !Array.isArray(columns) || !columns[columnIndex]) {
          return;
        }

        const column = columns[columnIndex];
        const field = column.data;

        if (field && sortableFieldsSet.value.has(field)) {
          event.preventDefault();
          event.stopPropagation();
          handleColumnSort(field, getDataSource());
          return;
        }
      }

      // 处理复选框点击
      if (columnIndex === 0 && rowIndex >= 0) {
        event.stopPropagation();
        event.preventDefault();

        const actualDataSource = getDataSource();
        const actualSelectedRowKeys = getSelectedRowKeys();
        const rowData = actualDataSource[rowIndex];
        const rowKey = (rowData as any)?._rowKey;

        if (!rowKey) return;

        const isCurrentlySelected = actualSelectedRowKeys.includes(rowKey);

        if (!Array.isArray(selectedRowKeys)) {
          if (isCurrentlySelected) {
            const index = actualSelectedRowKeys.indexOf(rowKey);
            if (index > -1) {
              selectedRowKeys.value.splice(index, 1);
            }
          } else {
            selectedRowKeys.value.push(rowKey);
          }
        }

        return;
      }

      // 双击处理
      if (event.detail === 2 && rowIndex >= 0 && columnIndex >= 0) {
        const columnConfig = hotColumns.value[columnIndex];
        if (!columnConfig) return;

        const field = columnConfig.data;

        if (field === 'combinedFeeStatus' || field === 'feeStatus') {
          return;
        } else if (
          [
            'feeCodeId',
            'industryCategory',
            'settlementId',
            'currencyId',
            'unit',
          ].includes(field)
        ) {
          const colIndex = getColumnIndex(field);

          if (field === 'feeCodeId') {
            const source = dropdownSources.value.feeCodeList.map(
              (item: any) => item.label,
            );
            onOpenDropdown?.(rowIndex, colIndex, field, source);
          } else if (field === 'industryCategory') {
            const source = dropdownSources.value.industryCategoryList.map(
              (item: any) => item.label,
            );
            onOpenDropdown?.(rowIndex, colIndex, field, source);
          } else if (field === 'currencyId') {
            const source = dropdownSources.value.currencyList.map(
              (item: any) => item.label,
            );
            onOpenDropdown?.(rowIndex, colIndex, field, source);
          } else if (field === 'settlementId') {
            const actualDataSource = getDataSource();
            const currentRow = actualDataSource[rowIndex];
            const currentRowAny = currentRow as any;
            let industryCategoryValue = getSettlementIndustryCategory(
              currentRowAny?.industryCategory_value,
            );

            // ✅ 关键修改：允许不选择行业类别，此时加载全部客户
            const categoryToLoad =
              industryCategoryValue && typeof industryCategoryValue === 'string'
                ? industryCategoryValue
                : '';

            loadClientList(categoryToLoad)
              .then((options: any[]) => {
                currentOptionsCache.value = options;
                const source = options.map((opt: any) => opt.label);
                onOpenDropdown?.(rowIndex, colIndex, field, source);
              })
              .catch(() => {
                message.error('加载客户列表失败');
              });

            return;
          } else if (field === 'unit') {
            const source =
              dropdownSources.value.unitList?.map((item: any) => item.label) ||
              [];
            onOpenDropdown?.(rowIndex, colIndex, field, source);
          }

          return;
        }
      }
    },

    // ✅ 关键修复：在编辑器开始前隐藏单元格内容
    beforeBeginEditing: function (this: any, row: number, col: number) {
      const columnConfig = hotColumns.value[col];
      if (!columnConfig || !columnConfig.data) return;

      const field = columnConfig.data;
      const td = this.getCell(row, col);

      if (!td) return;

      // 保存原始内容用于恢复
      td._originalHTML = td.innerHTML;
      td._originalColor = td.style.color;
      td._originalOpacity = td.style.opacity;

      // 隐藏原始内容，但保留编辑器容器
      td.style.color = 'transparent';
      td.style.opacity = '0';

      // 对于下拉字段，还需要特殊处理
      if (
        [
          'feeCodeId',
          'industryCategory',
          'settlementId',
          'currencyId',
          'unit',
        ].includes(field)
      ) {
        // 保存原值
        const currentValue = this.getDataAtCell(row, col);
        this.setCellMeta(row, col, 'originalValue', currentValue);

        // 清空文本内容，但保留结构
        const textNodes = Array.from(td.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE,
        );
        textNodes.forEach((node) => {
          node.textContent = '';
        });
      }
    },

    // ✅ 关键修复：编辑器激活时进一步隐藏内容
    afterBeginEditing: function (this: any, row: number, col: number) {
      const td = this.getCell(row, col);
      if (!td) return;

      // 确保内容完全隐藏
      td.style.visibility = 'hidden';

      // 延迟执行，确保编辑器已创建
      setTimeout(() => {
        const editor = this.getActiveEditor();
        if (editor && editor.TEXTAREA) {
          // 确保编辑器可见
          editor.TEXTAREA.style.visibility = 'visible';
          editor.TEXTAREA.style.opacity = '1';
        }
      }, 0);
    },

    // ✅ 关键修复：编辑器关闭后恢复内容
    afterEditCell: function (this: any, row: number, col: number) {
      const td = this.getCell(row, col);
      if (!td) return;

      // 恢复原始样式
      td.style.color = td._originalColor || '';
      td.style.opacity = td._originalOpacity || '';
      td.style.visibility = '';

      // 清理临时属性
      delete td._originalHTML;
      delete td._originalColor;
      delete td._originalOpacity;
    },

    // ✅ 键盘事件处理
    afterOnCellKeyDown: function (
      this: any,
      event: KeyboardEvent,
      coords: any,
      td: HTMLTableCellElement,
    ) {
      const columnIndex = coords.col;
      const rowIndex = coords.row;

      if (rowIndex >= 0 && columnIndex >= 0) {
        const columnConfig = hotColumns.value[columnIndex];
        if (columnConfig && columnConfig.data) {
          const field = columnConfig.data;

          if (
            [
              'feeCodeId',
              'industryCategory',
              'settlementId',
              'currencyId',
              'unit',
            ].includes(field)
          ) {
            const editor = this.getCellEditor(rowIndex, columnIndex);

            if (editor && typeof editor.isOpened === 'function') {
              const isOpened = editor.isOpened();

              if (isOpened && event.key === 'Escape') {
                // ESC 取消编辑，恢复原值
                const originalValue = this.getCellMeta(
                  rowIndex,
                  columnIndex,
                )?.originalValue;

                if (originalValue !== undefined && originalValue !== null) {
                  this.setDataAtCell(
                    rowIndex,
                    columnIndex,
                    originalValue,
                    'setValueConversion',
                  );
                }

                // 恢复显示
                td.style.color = '';
                td.style.opacity = '';
                td.style.visibility = '';

                // 清理元数据
                this.removeCellMeta(rowIndex, columnIndex, 'originalValue');
              }
            }
          }
        }
      }
    },

    afterRenderer: function (
      this: any,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) {
      // 费用状态着色 - 使用 setProperty 确保优先级
      const actualDataSource = getDataSource();
      const rowData = actualDataSource[row];
      if (rowData) {
        const feeStatus =
          (rowData as any).combinedFeeStatus ?? (rowData as any).feeStatus;

        if (feeStatus !== undefined && feeStatus !== null) {
          const statusOptions = getFeeStatusOptions();
          const statusOption = statusOptions.find(
            (opt) => opt.value === feeStatus,
          );

          if (statusOption?.color) {
            // ✅ 使用 setProperty 并添加 !important 确保样式不被覆盖
            td.style.setProperty(
              'background-color',
              `${statusOption.color}30`,
              'important',
            );
          }
        }
      }
    },

    afterGetColHeader: (col: number, TH: HTMLTableCellElement) => {
      if (col === 0) {
        TH.innerHTML = '';

        const container = document.createElement('div');
        container.style.cssText =
          'display:flex;align-items:center;justify-content:center;height:100%;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'select-all-checkbox';
        checkbox.style.cssText = 'width:16px;height:16px;cursor:pointer;';

        const allSelected =
          getSelectedRowKeys().length > 0 &&
          getSelectedRowKeys().length === getDataSource().length;
        checkbox.checked = allSelected;

        checkbox.onclick = (e) => {
          e.stopPropagation();
          const isChecked = checkbox.checked;

          if (!Array.isArray(selectedRowKeys)) {
            if (isChecked) {
              selectedRowKeys.value = getDataSource().map(
                (row: any) => row._rowKey,
              );
            } else {
              selectedRowKeys.value = [];
            }
          }
        };

        container.appendChild(checkbox);
        TH.appendChild(container);
      }
    },

    afterChange: function (this: any, changes: any, source: string) {
      if (
        source === 'loadData' ||
        source === 'updateData' ||
        source === 'setValueConversion' ||
        source === 'columnSort'
      ) {
        return;
      }

      let processedChanges = changes;

      if (changes && Array.isArray(changes)) {
        const convertedChanges = changes.map((change: any) => {
          const [row, prop, oldValue, newValue] = change;

          if (
            [
              'feeCodeId',
              'industryCategory',
              'currencyId',
              'unit',
              'settlementId',
            ].includes(prop)
          ) {
            let sourceList: Array<{ label: string; value: any }> = [];

            if (prop === 'feeCodeId') {
              sourceList = dropdownSources.value.feeCodeList;
            } else if (prop === 'industryCategory') {
              sourceList = dropdownSources.value.industryCategoryList;
            } else if (prop === 'currencyId') {
              sourceList = dropdownSources.value.currencyList;
            } else if (prop === 'unit') {
              sourceList = dropdownSources.value.unitList;
            } else if (prop === 'settlementId') {
              sourceList = currentOptionsCache.value || [];
            }

            const matchedItem = sourceList.find(
              (item) => item.label === newValue,
            );

            if (matchedItem) {
              const actualDataSource = getDataSource();
              if (actualDataSource[row]) {
                (actualDataSource[row] as any)[prop] = newValue;
                (actualDataSource[row] as any)[`${prop}_value`] =
                  matchedItem.value;
              }

              return [row, prop, oldValue, newValue];
            }
          }

          return change;
        });

        processedChanges = convertedChanges;
      }

      linkage.handleAfterChange(processedChanges, source, null);
    },
  });

  return {
    hotSettings,
  };
}
