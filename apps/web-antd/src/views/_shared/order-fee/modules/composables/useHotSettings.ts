import { shallowRef, nextTick, type Ref } from 'vue';
import { message } from 'ant-design-vue';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { getFeeStatusOptions, isFeeStatemented } from '../../data';

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
  onDoubleClickFeeStatus?: (row: any) => void, // ✅ 新增：双击费用状态的回调
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
    // ✅ 新增：设置回车键移动方向为向右（row: 0, col: 1）
    enterMoves: { row: 0, col: 1 },
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

    // 已对账费用（statements 不为空）整行只读，不可编辑、不可保存
    cells: function (row: number, col: number, prop: string | number) {
      const cellProperties: Record<string, any> = {};
      // 初始化阶段 handsontable 会以 null 调用获取模板，跳过
      if (row === null || row === undefined || row < 0) {
        return cellProperties;
      }
      const rowData = getDataSource()[row];
      if (rowData && isFeeStatemented(rowData)) {
        cellProperties.readOnly = true;
      }
      return cellProperties;
    },

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

        // ✅ 修复：双击费用状态字段时打开审核历史
        if (field === 'combinedFeeStatus' || field === 'feeStatus') {
          const actualDataSource = getDataSource();
          const rowData = actualDataSource[rowIndex];
          if (rowData && onDoubleClickFeeStatus) {
            onDoubleClickFeeStatus(rowData);
          }
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
          (node): node is Text => node.nodeType === Node.TEXT_NODE,
        );
        textNodes.forEach((node) => {
          node.textContent = '';
        });

        // ✅ 关键修复：对于 settlementId 和 unit 列，在编辑器激活前预加载数据
        // 这样 autocomplete 编辑器的 source 函数就能获取到最新数据
        if (field === 'settlementId') {
          const actualDataSource = getDataSource();
          const currentRow = actualDataSource[row] as any;
          let industryCategoryValue = getSettlementIndustryCategory(
            currentRow?.industryCategory_value,
          );

          // ✅ 允许不选择行业类别，此时加载全部客户
          const categoryToLoad =
            industryCategoryValue && typeof industryCategoryValue === 'string'
              ? industryCategoryValue
              : '';

          // 异步加载客户列表
          loadClientList(categoryToLoad)
            .then((options: any[]) => {
              currentOptionsCache.value = options;
              // ✅ 更新当前单元格的 source meta，确保 autocomplete 编辑器能看到新数据
              this.setCellMeta(
                row,
                col,
                'source',
                options.map((opt: any) => opt.label),
              );
              console.log(
                `✅ [beforeBeginEditing] settlementId 已加载 ${options.length} 个客户选项`,
              );
            })
            .catch((error) => {
              console.error('❌ [beforeBeginEditing] 加载客户列表失败:', error);
              message.error('加载客户列表失败');
            });
        } else if (field === 'unit') {
          // ✅ 对于 unit 列，确保 dropdownSources.unitList 是最新的
          const source =
            dropdownSources.value.unitList?.map((item: any) => item.label) ||
            [];
          this.setCellMeta(row, col, 'source', source);
          console.log(
            `✅ [beforeBeginEditing] unit 已设置 ${source.length} 个单位选项`,
          );
        }
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

    // ✅ 新增：在最后一行按向下键时触发新增行（使用 beforeKeyDown 更可靠）
    beforeKeyDown: function (this: any, event: KeyboardEvent) {
      // 只处理 ArrowDown 键
      if (event.key !== 'ArrowDown') {
        return;
      }

      const selected = this.getSelected();
      if (!selected || !Array.isArray(selected) || selected.length === 0) {
        return;
      }

      // 获取当前选中的起始行
      const [startRow] = selected[0];

      // 检查是否在数据行中（不是表头）
      if (startRow < 0) {
        return;
      }

      const totalRows = this.countRows();

      // 如果当前是最后一行
      if (startRow === totalRows - 1) {
        // ✅ 关键修复：检查是否正在编辑单元格，如果是则不触发新增行
        const activeEditor = this.getActiveEditor();
        if (activeEditor && activeEditor.isOpened && activeEditor.isOpened()) {
          console.log('⚠️ [beforeKeyDown] 编辑器打开中，跳过新增行逻辑');
          return;
        }

        // 阻止默认的向下移动行为
        event.preventDefault();
        event.stopPropagation();

        console.log('⬇️ [beforeKeyDown] 检测到最后一行按向下键，准备新增行');

        // 延迟执行，确保当前编辑完成
        setTimeout(() => {
          // 触发自定义事件，由父组件处理
          const cell = this.getCell(startRow, 0);
          if (cell) {
            const customEvent = new CustomEvent('addNewRow', {
              bubbles: true,
              detail: { rowIndex: startRow, columnIndex: 0 },
            });
            cell.dispatchEvent(customEvent);
            console.log('✅ [beforeKeyDown] 已触发 addNewRow 事件');
          }
        }, 50);
      }
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
