import { shallowRef, nextTick, type Ref } from 'vue';
import { message } from 'ant-design-vue';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import { getFeeStatusOptions } from '../../data';

/**
 * Handsontable 设置 Composable
 */
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
) {
  // 辅助函数：解构 Ref
  const getDataSource = () =>
    Array.isArray(dataSource) ? dataSource : dataSource.value;
  const getSelectedRowKeys = () =>
    Array.isArray(selectedRowKeys) ? selectedRowKeys : selectedRowKeys.value;

  const hotSettings = shallowRef({
    data: getDataSource(),
    imeFastEdit: true,
    columns: hotColumns.value,
    rowHeaders: false,
    colHeaders: true,
    height: 520,
    licenseKey: 'non-commercial-and-evaluation',
    contextMenu: true,
    manualColumnResize: true,
    manualRowMove: false,
    stretchH: 'all',
    autoWrapRow: true,
    autoWrapCol: true,
    // ✅ 关键修复：在渲染前检测编辑状态，防止自定义内容与编辑器冲突
    beforeRenderer: function (
      this: any,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) {
      const columnConfig = hotColumns.value[col];
      if (!columnConfig || !columnConfig.data) return;

      const field = columnConfig.data;

      // 只处理下拉框相关的字段
      if (
        [
          'feeCodeId',
          'industryCategory',
          'settlementId',
          'currencyId',
          'unit',
        ].includes(field)
      ) {
        // 检查是否处于编辑模式
        const editor = this.getCellEditor(row, col);
        if (editor && typeof editor.isOpened === 'function') {
          const isOpened = editor.isOpened();
          console.log(
            `🔍 [beforeRenderer] ${field} - row:${row}, col:${col}, editorOpened:${isOpened}`,
          );

          if (isOpened) {
            // 编辑器已打开，清空单元格内容，让 Handsontable 管理编辑器 DOM
            console.log(
              `✅ [beforeRenderer] 清空 ${field} 单元格内容，当前 innerHTML: "${td.innerHTML.substring(0, 50)}..."`,
            );
            td.innerHTML = '';
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
      // ✅ 补充机制：再次检测编辑状态，确保编辑器打开时不显示自定义内容
      const columnConfig = hotColumns.value[col];
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
          const editor = this.getCellEditor(row, col);
          if (editor && typeof editor.isOpened === 'function') {
            const isOpened = editor.isOpened();
            console.log(
              `🔍 [afterRenderer] ${field} - row:${row}, col:${col}, editorOpened:${isOpened}`,
            );

            if (isOpened) {
              // 编辑器已打开，清空单元格内容
              console.log(`✅ [afterRenderer] 清空 ${field} 单元格内容`);
              td.innerHTML = '';
            }
          }
        }
      }

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
            td.style.setProperty(
              'background-color',
              statusOption.color + '30',
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
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.height = '100%';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'select-all-checkbox';
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.cursor = 'pointer';

        const allSelected =
          getSelectedRowKeys().length > 0 &&
          getSelectedRowKeys().length === getDataSource().length;
        checkbox.checked = allSelected;

        container.appendChild(checkbox);
        TH.appendChild(container);

        checkbox.onclick = (e) => {
          e.stopPropagation();
          const isChecked = checkbox.checked;
          const actualSelectedRowKeys = getSelectedRowKeys();
          const actualDataSource = getDataSource();

          if (isChecked) {
            // 注意：这里需要修改 selectedRowKeys，但它是 Ref
            // 我们需要通过外部传入的 ref 来修改
            // 这里暂时保持原逻辑，实际使用时需要在外部处理
            const newKeys = actualDataSource.map((row: any) => row._rowKey);
            if (!Array.isArray(selectedRowKeys)) {
              selectedRowKeys.value.splice(
                0,
                selectedRowKeys.value.length,
                ...newKeys,
              );
            }
          } else {
            if (!Array.isArray(selectedRowKeys)) {
              selectedRowKeys.value.splice(0, selectedRowKeys.value.length);
            }
          }

          // ✅ 关键修复：触发 Handsontable 重新渲染，更新所有行复选框的视觉状态
          nextTick(() => {
            // 注意：这里的 this 不指向 Handsontable 实例，需要通过其他方式获取
            // 由于这是在 afterGetColHeader 中，我们无法直接访问 hotInstance
            // 依赖父组件的 watch 来触发渲染
            // console.log(`✅ [checkbox.onclick] 全选状态已更新，等待父组件 watch 触发渲染`);
          });
        };
      }
    },
    afterSelection: () => {
      // 跳过，由复选框控制
    },
    afterOnCellMouseDown: function (
      this: any,
      event: MouseEvent,
      coords: any,
      td: HTMLTableCellElement,
    ) {
      const columnIndex = coords.col;
      const rowIndex = coords.row;

      if (event.detail === 2 && rowIndex >= 0 && columnIndex >= 0) {
        const columnConfig = hotColumns.value[columnIndex];
        if (!columnConfig) return;

        const field = columnConfig.data;

        if (field === 'combinedFeeStatus' || field === 'feeStatus') {
          const actualDataSource = getDataSource();
          const rowData = actualDataSource[rowIndex];
          if (!rowData) return;
          // 这里应该触发打开审核历史弹窗的事件
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
          console.log(
            `🖱️ [afterOnCellMouseDown] 双击 ${field} - row:${rowIndex}, col:${columnIndex}`,
          );

          // 暂时恢复原逻辑：只清空 DOM 内容，不操作 Handsontable 实例数据
          // 避免因 this 指向问题导致的 TypeScript 错误和运行时错误
          td.innerHTML = '';
          console.log(
            `✅ [afterOnCellMouseDown] 已清空 ${field} 单元格内容（DOM）`,
          );
          event.preventDefault();
          event.stopPropagation();

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

            if (
              !industryCategoryValue ||
              typeof industryCategoryValue !== 'string'
            ) {
              message.warning('请先选择行业类别');
              return;
            }

            // ✅ 修改：从缓存中同步获取结算对象列表（不再异步加载）
            loadClientList(industryCategoryValue)
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
        } else if (
          [
            'exchangeRate',
            'unitPrice',
            'amount',
            'quantity',
            'taxRate',
            'remark',
          ].includes(field)
        ) {
          td.innerHTML = '';
        }
      }

      if (columnIndex === 0 && rowIndex >= 0) {
        event.stopPropagation();
        event.preventDefault();

        const actualDataSource = getDataSource();
        const actualSelectedRowKeys = getSelectedRowKeys();
        const rowData = actualDataSource[rowIndex];
        const rowKey = (rowData as any)?._rowKey;

        if (!rowKey) return;

        const isCurrentlySelected = actualSelectedRowKeys.includes(rowKey);

        if (isCurrentlySelected) {
          const index = actualSelectedRowKeys.indexOf(rowKey);
          if (index > -1) {
            if (!Array.isArray(selectedRowKeys)) {
              selectedRowKeys.value.splice(index, 1);
            }
          }
        } else {
          if (!Array.isArray(selectedRowKeys)) {
            selectedRowKeys.value.push(rowKey);
          }
        }

        // ✅ 关键修复：立即更新当前单元格复选框的 DOM，提供即时视觉反馈
        const checkbox = td.querySelector(
          'input[type="checkbox"]',
        ) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = !isCurrentlySelected;
        }

        // 异步触发完整表格重新渲染，确保所有状态一致
        nextTick(() => {
          if (this && typeof this.render === 'function') {
            this.render();
          }
        });

        return;
      }

      if (columnIndex === 1) {
        return;
      }

      if (rowIndex === -1 && columnIndex >= 0) {
        const columnConfig = hotColumns.value[columnIndex];
        if (!columnConfig || !columnConfig.data) return;

        const field = columnConfig.data;

        if (!sortableFieldsSet.value.has(field)) return;

        event.preventDefault();
        event.stopPropagation();

        const actualDataSource = getDataSource();
        handleColumnSort(field, actualDataSource);
        return;
      }

      if (rowIndex < 0 || columnIndex < 0) {
        return;
      }
    },
    afterChange: function (this: any, changes: any, source: string) {
      if (
        source === 'loadData' ||
        source === 'updateData' ||
        source === 'setValueConversion'
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
            } else {
              return change;
            }
          }

          return change;
        });

        processedChanges = convertedChanges;
      }

      // 调用 linkage 的 handleAfterChange 处理联动逻辑
      linkage.handleAfterChange(processedChanges, source, null);

      // ✅ 关键修复：在处理完变化后，强制重新渲染以显示新值
      if (changes && Array.isArray(changes) && changes.length > 0) {
        const [row, prop] = changes[0];
        // 对所有字段都进行强制渲染，不只是下拉字段
        console.log(
          `🔄 [afterChange] 检测到数据变化 row: ${row}, prop: ${prop}`,
        );
        // 使用 setTimeout 确保在数据更新后再渲染
        setTimeout(() => {
          this.render();
          console.log(`✅ [afterChange] 渲染完成`);
        }, 0);
      }
    },
    // ✅ 关键修复：检测用户是否取消了编辑（按 ESC），如果是则恢复原值
    afterOnCellKeyDown: function (
      this: any,
      event: KeyboardEvent,
      coords: any,
      td: HTMLTableCellElement,
    ) {
      console.log(
        `🔍 [afterOnCellKeyDown] 触发 - key: "${event.key}", row: ${coords.row}, col: ${coords.col}`,
      );

      const columnIndex = coords.col;
      const rowIndex = coords.row;

      if (rowIndex >= 0 && columnIndex >= 0) {
        const columnConfig = hotColumns.value[columnIndex];
        if (columnConfig && columnConfig.data) {
          const field = columnConfig.data;
          console.log(`📋 [afterOnCellKeyDown] 字段: ${field}`);

          // 只处理下拉框相关的字段
          if (
            [
              'feeCodeId',
              'industryCategory',
              'settlementId',
              'currencyId',
              'unit',
            ].includes(field)
          ) {
            console.log(`✅ [afterOnCellKeyDown] 是下拉字段，检查编辑器状态`);

            // 检查编辑器是否已打开
            const editor = this.getCellEditor(rowIndex, columnIndex);
            console.log(`📝 [afterOnCellKeyDown] 编辑器存在: ${!!editor}`);

            if (editor && typeof editor.isOpened === 'function') {
              const isOpened = editor.isOpened();
              console.log(`📝 [afterOnCellKeyDown] 编辑器已打开: ${isOpened}`);

              if (isOpened) {
                // 用户按 ESC 取消编辑，恢复原值
                if (event.key === 'Escape') {
                  console.log(`↩️ [afterOnCellKeyDown] 检测到 ESC 键`);
                  const originalValue = this.getCellMeta(
                    rowIndex,
                    columnIndex,
                  )?.originalValue;
                  if (originalValue !== undefined && originalValue !== null) {
                    console.log(
                      `↩️ [afterOnCellKeyDown] 恢复原值: "${originalValue}"`,
                    );
                    this.setDataAtCell(
                      rowIndex,
                      columnIndex,
                      originalValue,
                      'setValueConversion',
                    );
                    this.removeCellMeta(rowIndex, columnIndex, 'originalValue');
                  }
                }
                // ✅ 关键修复：用户按 Enter 确认选择前，保存原值并清空 TD
                else if (event.key === 'Enter') {
                  console.log(`⌨️ [afterOnCellKeyDown] 检测到 Enter 键`);

                  // 如果还没有保存原值，先保存
                  const currentMeta = this.getCellMeta(rowIndex, columnIndex);
                  if (!currentMeta.originalValue) {
                    const currentValue = this.getDataAtCell(
                      rowIndex,
                      columnIndex,
                    );
                    this.setCellMeta(
                      rowIndex,
                      columnIndex,
                      'originalValue',
                      currentValue,
                    );
                    console.log(
                      `💾 [afterOnCellKeyDown] 保存原值: "${currentValue}"`,
                    );
                  }

                  // ✅ 关键修复：延迟清空 TD 的 innerHTML，防止原文本残留
                  setTimeout(() => {
                    const td = this.getCell(rowIndex, columnIndex);
                    if (td) {
                      console.log(
                        `🧹 [afterOnCellKeyDown-delayed] 清空 TD innerHTML: "${td.innerHTML.substring(0, 50)}..."`,
                      );
                      td.innerHTML = '';
                      console.log(
                        `✅ [afterOnCellKeyDown-delayed] 已清空 TD 内容`,
                      );
                    }
                  }, 0);
                }
              }
            }
          }
        }
      }
    },
    // ✅ 关键修复：编辑器开始编辑时，保存原值并设置 source
    afterBeginEditing: function (this: any, row: number, col: number) {
      console.log(`🔍 [afterBeginEditing] 触发 - row: ${row}, col: ${col}`);

      const columnConfig = hotColumns.value[col];
      if (!columnConfig || !columnConfig.data) {
        console.log(`⚠️ [afterBeginEditing] 没有列配置`);
        return;
      }

      const field = columnConfig.data;
      console.log(`📋 [afterBeginEditing] 字段: ${field}`);

      // 只处理下拉框相关的字段
      if (
        [
          'feeCodeId',
          'industryCategory',
          'settlementId',
          'currencyId',
          'unit',
        ].includes(field)
      ) {
        console.log(`✅ [afterBeginEditing] 是下拉字段`);

        // 保存原值到元数据，以便用户按 ESC 时可以恢复
        const currentValue = this.getDataAtCell(row, col);
        this.setCellMeta(row, col, 'originalValue', currentValue);
        console.log(`💾 [afterBeginEditing] 保存原值: "${currentValue}"`);

        // ✅ 关键修复：确保 source 已设置
        const currentSource = this.getCellMeta(row, col)?.source;
        console.log(
          `📋 [afterBeginEditing] 当前 source:`,
          currentSource ? `有 ${currentSource.length} 个选项` : '未设置',
        );

        if (!currentSource || currentSource.length === 0) {
          console.log(`⚠️ [afterBeginEditing] source 未设置，需要动态加载`);

          // 根据字段类型设置 source
          if (field === 'feeCodeId') {
            const source = dropdownSources.value.feeCodeList.map(
              (item: any) => item.label,
            );
            this.setCellMeta(row, col, 'source', source);
            console.log(
              `✅ [afterBeginEditing] 已设置 feeCodeId source，共 ${source.length} 个选项`,
            );
          } else if (field === 'industryCategory') {
            const source = dropdownSources.value.industryCategoryList.map(
              (item: any) => item.label,
            );
            this.setCellMeta(row, col, 'source', source);
            console.log(
              `✅ [afterBeginEditing] 已设置 industryCategory source，共 ${source.length} 个选项`,
            );
          } else if (field === 'currencyId') {
            const source = dropdownSources.value.currencyList.map(
              (item: any) => item.label,
            );
            this.setCellMeta(row, col, 'source', source);
            console.log(
              `✅ [afterBeginEditing] 已设置 currencyId source，共 ${source.length} 个选项`,
            );
          } else if (field === 'settlementId') {
            // 结算对象需要异步加载
            const actualDataSource = getDataSource();
            const currentRow = actualDataSource[row];
            const currentRowAny = currentRow as any;
            let industryCategoryValue = getSettlementIndustryCategory(
              currentRowAny?.industryCategory_value,
            );

            if (
              industryCategoryValue &&
              typeof industryCategoryValue === 'string'
            ) {
              // ✅ 修改：从缓存中同步获取客户列表（不再异步请求后端）
              loadClientList(industryCategoryValue)
                .then((options: any[]) => {
                  currentOptionsCache.value = options;
                  const source = options.map((opt: any) => opt.label);
                  this.setCellMeta(row, col, 'source', source);
                  console.log(
                    `✅ [afterBeginEditing-settlementId] 已从缓存设置 source，共 ${source.length} 个选项`,
                  );
                  // 重新渲染以应用新的 source
                  this.render();
                })
                .catch(() => {
                  console.error(
                    `❌ [afterBeginEditing-settlementId] 加载客户列表失败`,
                  );
                });
            } else {
              console.warn(
                `⚠️ [afterBeginEditing-settlementId] 行业类别未设置`,
              );
            }
          } else if (field === 'unit') {
            const source =
              dropdownSources.value.unitList?.map((item: any) => item.label) ||
              [];
            this.setCellMeta(row, col, 'source', source);
            console.log(
              `✅ [afterBeginEditing] 已设置 unit source，共 ${source.length} 个选项`,
            );
          }
        }

        // ✅ 关键修复：延迟清空 TD 的 innerHTML，让 autocomplete 编辑器正确显示
        setTimeout(() => {
          const td = this.getCell(row, col);
          if (td) {
            console.log(
              `🧹 [afterBeginEditing-delayed] 清空 TD innerHTML: "${td.innerHTML.substring(0, 50)}..."`,
            );
            td.innerHTML = '';
            console.log(`✅ [afterBeginEditing-delayed] 已清空 TD 内容`);
          }
        }, 0);
      }
    },
    // ✅ 简化：在按键按下前处理，确保键盘导航选择后按回车时也能清空原文本
    beforeKeyDown: function (this: any, event: KeyboardEvent) {
      console.log(`🔍 [beforeKeyDown] 触发 - key: "${event.key}"`);

      // 检查当前是否有活动的编辑器
      const selected = this.getSelectedLast();
      if (!selected) {
        console.log(`⚠️ [beforeKeyDown] 没有选中的单元格`);
        return;
      }

      const [row, col] = selected;
      if (row < 0 || col < 0) {
        console.log(
          `⚠️ [beforeKeyDown] 无效的行列索引: row=${row}, col=${col}`,
        );
        return;
      }

      const columnConfig = hotColumns.value[col];
      if (!columnConfig || !columnConfig.data) {
        console.log(`⚠️ [beforeKeyDown] 没有列配置`);
        return;
      }

      // 处理所有字段的 Enter 键
      const editor = this.getCellEditor(row, col);
      if (editor) {
        console.log(`📝 [beforeKeyDown] 编辑器存在: ${!!editor}`);
        console.log(
          `📝 [beforeKeyDown] 编辑器类型: ${editor?.constructor?.name}`,
        );

        // ✅ 关键修复：只要编辑器存在且按的是 Enter 键，就执行逻辑（不检查 isOpened）
        if (event.key === 'Enter') {
          console.log(`⌨️ [beforeKeyDown] 检测到 Enter 键`);

          // 保存原值到元数据（如果还没有保存）
          const currentMeta = this.getCellMeta(row, col);
          if (!currentMeta.originalValue) {
            const currentValue = this.getDataAtCell(row, col);
            this.setCellMeta(row, col, 'originalValue', currentValue);
            console.log(`💾 [beforeKeyDown] 保存原值: "${currentValue}"`);
          } else {
            console.log(
              `💾 [beforeKeyDown] 原值已存在: "${currentMeta.originalValue}"`,
            );
          }

          // ✅ 关键修复：延迟清空 TD 的 innerHTML，防止原文本与新文本重叠
          setTimeout(() => {
            const td = this.getCell(row, col);
            if (td) {
              console.log(
                `🧹 [beforeKeyDown-delayed] 清空 TD innerHTML: "${td.innerHTML.substring(0, 50)}..."`,
              );
              td.innerHTML = '';
              console.log(`✅ [beforeKeyDown-delayed] 已清空 TD 内容`);
            }
          }, 0);
        }
      }
    },
    observeDOMVisibility: true,
  });

  return {
    hotSettings,
  };
}
