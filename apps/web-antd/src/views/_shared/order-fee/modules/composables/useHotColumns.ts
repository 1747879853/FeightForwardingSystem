import { createFieldPermission } from '#/composables/field-permission';
import { orderFeeFieldPermission } from '#/composables/field-permission-profiles';
import { loadMaskedFields } from '#/composables/use-masked-fields';
import { computed, type Ref } from 'vue';
import {
  ORDER_FEE_EDIT_COLUMN_META,
  resolveHotColumnWidth,
} from '../../order-fee-column-meta';
import { getStatementNumsText, resolveOrderFeeColumnTitle } from '../../data';
import { formatWeightVolumeLocale } from '#/utils/weight-volume-precision';

import {
  getInvoiceStatusLabel,
  getFeeStatusLabel,
  getDataEntryMethodLabel,
  formatDateTime,
  isOrderFeeRejectedStatus,
  resolveLatestOrderFeeRejectRemark,
} from '../utils/helpers';
import { getFeeInvoiceStatusTextColor } from '#/views/settlement-management/invoice-issue/invoice-status';

const FEE_REJECT_TIP_CLASS = 'fee-reject-help-floating-tip';

function hideFeeRejectHelpTip() {
  document.querySelectorAll(`.${FEE_REJECT_TIP_CLASS}`).forEach((el) => {
    el.remove();
  });
}

function showFeeRejectHelpTip(anchor: HTMLElement, reason: string) {
  hideFeeRejectHelpTip();
  const tip = document.createElement('div');
  tip.className = FEE_REJECT_TIP_CLASS;
  const tipHint = document.createElement('div');
  tipHint.textContent = '双击“驳回”字样查看审核流程';
  const tipReason = document.createElement('div');
  tipReason.textContent = `驳回原因：${reason || '无'}`;
  tip.append(tipHint, tipReason);
  document.body.appendChild(tip);
  const rect = anchor.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  let top = rect.top - tipRect.height - 8;
  if (top < 8) {
    top = rect.bottom + 8;
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

/**
 * Handsontable 列配置生成器
 */
export function useHotColumns(
  _props: { type: number },
  dropdownSources: any,
  dataSource: Ref<any[]> | any[],
  selectedRowKeys: (string | number)[] | Ref<(string | number)[]>,
  sortableFieldsSet: any,
  sortState: any,
  getSortIcon: (field: string) => string,
  currentOptionsCache: any,
  allClientsByIndustry?: Ref<Record<string, any[]>>,
) {
  // ✅ 全量客户的合法取值集合（同时收录 label「编码-名称」与 name「仅名称」两种格式）。
  // 结算对象列是 strict + allowInvalid:false 的 autocomplete，其 source 依赖仅在打开下拉
  // 编辑器时才填充的 currentOptionsCache；而拖拽填充柄(autofill)/粘贴不会打开编辑器，此时缓存
  // 为空会让 strict 校验把合法的复制值判为无效并取消写入（表现为“填充无效”）。用该集合兜底：
  // 只要复制值精确命中某个客户，就纳入候选，保证填充生效。
  const allClientValueSet = computed<Set<string>>(() => {
    const set = new Set<string>();
    const grouped = allClientsByIndustry?.value || {};
    Object.keys(grouped).forEach((key) => {
      (grouped[key] || []).forEach((client: any) => {
        if (client?.label) set.add(String(client.label));
        if (client?.name) set.add(String(client.name));
      });
    });
    return set;
  });

  void loadMaskedFields();
  const fieldPermission = createFieldPermission(orderFeeFieldPermission);
  const hotColumns = computed(() => {
    // 解构 Ref 获取实际值
    const actualDataSource = Array.isArray(dataSource)
      ? dataSource
      : dataSource.value;
    const actualSelectedRowKeys = Array.isArray(selectedRowKeys)
      ? selectedRowKeys
      : selectedRowKeys.value;

    // ✅ 新增:在第一列添加复选框列
    const checkboxColumn: any = {
      data: '_isSelected',
      title: '',
      width: 50,
      type: 'text',
      className: 'htCenter htMiddle',
      readOnly: true,
      renderer: function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        // ✅ 关键修复：在渲染器执行时动态获取最新的 selectedRowKeys，确保响应式更新
        const currentDataSource = Array.isArray(dataSource)
          ? dataSource
          : dataSource.value;
        const currentSelectedRowKeys = Array.isArray(selectedRowKeys)
          ? selectedRowKeys
          : selectedRowKeys.value;

        const rowData = currentDataSource[row];
        const rowKey = (rowData as any)?._rowKey;
        const isSelected = rowKey && currentSelectedRowKeys.includes(rowKey);

        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!isSelected;
        checkbox.style.width = '16px';
        checkbox.style.height = '16px';
        checkbox.style.cursor = 'pointer';
        checkbox.style.pointerEvents = 'none';

        td.appendChild(checkbox);
        return td;
      },
    };

    // 序号独立一列，不与开票状态混排
    const indexColumn: any = {
      data: '_rowIndex',
      title: '序号',
      width: 50,
      type: 'text',
      className: 'htCenter htMiddle',
      readOnly: true,
      renderer: function (
        this: any,
        instance: any,
        td: HTMLTableCellElement,
        row: number,
      ) {
        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';
        td.textContent = String(row + 1);
        return td;
      },
    };

    const columns = [checkboxColumn, indexColumn];

    const mappedColumns = ORDER_FEE_EDIT_COLUMN_META.map((meta) => {
      const hotCol: any = {
        data: meta.field,
        title: resolveOrderFeeColumnTitle(meta),
        width: resolveHotColumnWidth(meta),
      };

      if (meta.field === 'invoiceStatus') {
        hotCol.type = 'text';
        hotCol.readOnly = true;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
        ) {
          const currentDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = currentDataSource[row];
          const invoiceStatus = (rowData as any)?.invoiceStatus;
          const statusLabel = getInvoiceStatusLabel(invoiceStatus);
          const statusColor = getFeeInvoiceStatusTextColor(invoiceStatus);

          td.innerHTML = '';
          td.style.textAlign = 'center';
          td.style.verticalAlign = 'middle';
          td.innerHTML = `<span style="color: ${statusColor}; font-weight: bold; font-size: 12px;">${statusLabel || ''}</span>`;
          return td;
        };
      } else if (meta.field === 'feeCodeId') {
        hotCol.type = 'autocomplete';
        hotCol.source = function (
          query: string,
          process: (items: string[]) => void,
        ) {
          const allOptions = dropdownSources.value.feeCodeList.map(
            (item: any) => item.label,
          );
          if (!query) {
            process(allOptions);
            return;
          }
          const searchLower = query.toLowerCase();
          const filtered = allOptions.filter((option: string) => {
            const optionLower =
              typeof option === 'string' ? option.toLowerCase() : '';
            return optionLower.includes(searchLower);
          });
          process(filtered);
        };
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.filteringCaseSensitive = false;
        hotCol.trimDropdown = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = '';

          // ✅ 获取当前行数据，判断是否为新增未保存的行
          const actualDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = actualDataSource[row] as any;
          const isNewRow = !rowData?.id || rowData.id === '';

          // ✅ 关键修改：只显示"-"后面的字符串（费用名称）
          let displayName = '';
          if (value && typeof value === 'string') {
            const parts = value.split('-');
            // 如果有"-"，取后面的部分；否则使用原值
            displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
          }

          // ✅ 修复：直接设置单元格样式和内容，不使用额外的 div 容器
          td.style.position = 'relative';

          // ✅ 如果是未保存的新增行，添加小标签
          if (isNewRow) {
            const labelSpan = document.createElement('span');
            labelSpan.textContent = '新';
            labelSpan.style.cssText =
              'position: absolute; top: 2px; right: 4px; background: #ff4d4f; color: white; font-size: 10px; padding: 1px 4px; border-radius: 2px; line-height: 1.2; z-index: 1; pointer-events: none;';
            td.appendChild(labelSpan);
          }

          // ✅ 添加费用名称文本
          const textSpan = document.createElement('span');
          textSpan.textContent = displayName || '请选择';
          textSpan.style.cssText = `color: ${displayName ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;`;
          td.appendChild(textSpan);

          return td;
        };
      } else if (meta.field === 'industryCategory') {
        hotCol.type = 'autocomplete';
        hotCol.source = function (
          query: string,
          process: (items: string[]) => void,
        ) {
          const allOptions = dropdownSources.value.industryCategoryList.map(
            (item: any) => item.label,
          );
          if (!query) {
            process(allOptions);
            return;
          }
          const searchLower = query.toLowerCase();
          const filtered = allOptions.filter((option: string) => {
            const optionLower =
              typeof option === 'string' ? option.toLowerCase() : '';
            return optionLower.includes(searchLower);
          });
          process(filtered);
        };
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        // 允许清空：strict 下默认空串会被判无效，显式放行 null/空
        hotCol.validator = function (
          value: any,
          callback: (valid: boolean) => void,
        ) {
          if (value === null || value === undefined || value === '') {
            callback(true);
            return;
          }
          const labels = dropdownSources.value.industryCategoryList.map(
            (item: any) => item.label,
          );
          callback(labels.includes(value));
        };
        hotCol.filteringCaseSensitive = false;
        hotCol.trimDropdown = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = '';
          const label = value || '';
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '请选择'}</span>`;
          return td;
        };
      } else if (meta.field === 'settlementId') {
        hotCol.type = 'autocomplete';
        // ✅ 关键修复：配置动态 source 函数，支持回车键触发下拉框
        hotCol.source = function (
          query: string,
          process: (items: string[]) => void,
        ) {
          // ✅ 这个函数会在编辑器激活时被调用
          // 实际的数据加载由 useHotSettings 中的 afterOnCellMouseDown 处理
          // 这里返回当前缓存的数据，确保 autocomplete 编辑器有数据可显示
          const cachedData = currentOptionsCache.value || [];
          const allLabels = cachedData.map((item: any) => item.label);

          if (!query) {
            process(allLabels);
            return;
          }

          // 支持搜索过滤
          const searchLower = query.toLowerCase();
          const filtered = allLabels.filter((label: string) => {
            return label.toLowerCase().includes(searchLower);
          });

          // ✅ 拖拽填充/粘贴兜底：此时编辑器未打开、currentOptionsCache 往往为空，
          // strict 校验会因候选为空把复制值判为无效并取消填充。若 query 精确命中
          // 全量客户（label 或 name），则纳入候选，保证合法的结算对象复制生效。
          if (!filtered.includes(query) && allClientValueSet.value.has(query)) {
            filtered.push(query);
          }
          process(filtered);
        };
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.width = 120;
        hotCol.filteringCaseSensitive = false;
        hotCol.trimDropdown = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = '';
          // ✅ 关键修改：只显示"-"后面的字符串（客户名称）
          let displayName = '';
          if (value && typeof value === 'string') {
            const parts = value.split('-');
            // 如果有"-"，取后面的部分；否则使用原值
            displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
          }
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${displayName ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayName || '请选择'}</span>`;
          return td;
        };
      } else if (meta.field === 'currencyId') {
        hotCol.type = 'autocomplete';
        hotCol.source = function (
          query: string,
          process: (items: string[]) => void,
        ) {
          const allOptions = dropdownSources.value.currencyList.map(
            (item: any) => item.label,
          );
          if (!query) {
            process(allOptions);
            return;
          }
          const searchLower = query.toLowerCase();
          const filtered = allOptions.filter((option: string) => {
            const optionLower =
              typeof option === 'string' ? option.toLowerCase() : '';
            return optionLower.includes(searchLower);
          });
          process(filtered);
        };
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.filteringCaseSensitive = false;
        hotCol.trimDropdown = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = '';
          const label = value || '';
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '请选择'}</span>`;
          return td;
        };
      } else if (meta.field === 'unit') {
        hotCol.type = 'autocomplete';
        // ✅ 关键修复：将空数组改为动态 source 函数
        hotCol.source = function (
          query: string,
          process: (items: string[]) => void,
        ) {
          // 从 dropdownSources 获取最新的单位列表
          const allUnits = dropdownSources.value.unitList || [];
          const allLabels = allUnits.map((item: any) => item.label);

          if (!query) {
            process(allLabels);
            return;
          }

          // 支持搜索过滤
          const searchLower = query.toLowerCase();
          const filtered = allLabels.filter((label: string) => {
            return label.toLowerCase().includes(searchLower);
          });
          process(filtered);
        };
        hotCol.strict = true;
        hotCol.allowInvalid = false;
        hotCol.filteringCaseSensitive = false;
        hotCol.trimDropdown = false;
        hotCol.visibleRows = 10;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = '';
          const label = value || '';
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '请选择'}</span>`;
          return td;
        };
      } else if (meta.field === 'unitPrice') {
        hotCol.type = 'numeric';
        hotCol.format = '0,0.00';
        hotCol.allowInvalid = false;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
          td.innerHTML = '';

          // ✅ 新增：格式化数值，添加千位逗号分隔符
          let displayValue = '0.00';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              displayValue = numValue.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            }
          }

          // ✅ 新增：右对齐样式 + 省略号
          td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; text-align: right; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayValue}</span>`;
          return td;
        };
      } else if (meta.field === 'quantity') {
        hotCol.type = 'numeric';
        hotCol.format = '0,0.[0000]';
        hotCol.allowInvalid = false;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = '';
          let displayValue = '0';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue)) {
              displayValue = formatWeightVolumeLocale(numValue) || '0';
            }
          }
          td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; text-align: right; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayValue}</span>`;
          return td;
        };
      } else if (meta.field === 'amount') {
        hotCol.type = 'numeric';
        hotCol.format = '0,0.00';
        hotCol.allowInvalid = false;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
          td.innerHTML = '';

          // ✅ 新增：格式化数值，添加千位逗号分隔符
          let displayValue = '0.00';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              displayValue = numValue.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
            }
          }

          // ✅ 新增：右对齐样式 + 省略号
          td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; text-align: right; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayValue}</span>`;
          return td;
        };
      } else if (meta.field === 'taxRate') {
        hotCol.type = 'numeric';
        hotCol.format = '0.00%';
        hotCol.allowInvalid = false;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
          td.innerHTML = '';
          const label = value || '';
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${label ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || '0.00%'}</span>`;
          return td;
        };
      } else if (meta.field === 'taxAmount') {
        hotCol.type = 'numeric';
        hotCol.format = '0,0.00';
        hotCol.allowInvalid = false;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${value || '0.00'}</span>`;
          return td;
        };
      } else if (meta.field === 'totalAmount') {
        hotCol.type = 'numeric';
        hotCol.format = '0,0.00';
        hotCol.allowInvalid = false;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${value || '0.00'}</span>`;
          return td;
        };
      } else if (meta.field === 'remark') {
        hotCol.type = 'text';
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // ✅ 关键修复：先清空单元格内容，防止与编辑器残留内容重叠
          td.innerHTML = '';
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${value ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${value || ''}</span>`;
          return td;
        };
      } else if (
        meta.field === 'combinedFeeStatus' ||
        meta.field === 'feeStatus'
      ) {
        hotCol.type = 'text';
        hotCol.readOnly = true;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const currentDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = currentDataSource[row] as any;
          const statusValue =
            value ?? rowData?.combinedFeeStatus ?? rowData?.feeStatus;
          const label = getFeeStatusLabel(statusValue);
          const modificationCount =
            rowData?.ModificationCount ??
            rowData?.modificationCount ??
            rowData?.MODIFICATIONCOUNT ??
            0;
          const rejected = isOrderFeeRejectedStatus(statusValue);

          td.innerHTML = '';
          td.style.cursor = 'pointer';
          td.style.textAlign = 'center';
          td.style.verticalAlign = 'middle';
          td.style.overflow = 'hidden';

          const wrap = document.createElement('span');
          wrap.className = 'fee-status-cell';
          wrap.style.display = 'inline-flex';
          wrap.style.alignItems = 'center';
          wrap.style.justifyContent = 'center';
          wrap.style.gap = '4px';
          wrap.style.maxWidth = '100%';
          wrap.style.whiteSpace = 'nowrap';
          wrap.style.overflow = 'hidden';

          const statusSpan = document.createElement('span');
          statusSpan.className = 'fee-status-label';
          statusSpan.textContent = label || '';
          statusSpan.style.color = '#262626';
          statusSpan.style.overflow = 'hidden';
          statusSpan.style.textOverflow = 'ellipsis';
          if (!rejected) {
            statusSpan.title = modificationCount
              ? `双击查看审核历史(共 ${modificationCount} 次修改)`
              : '双击查看审核历史';
          }
          wrap.appendChild(statusSpan);

          if (rejected) {
            const help = document.createElement('span');
            help.className = 'fee-reject-help';
            help.setAttribute('aria-label', '查看驳回原因');
            help.textContent = '?';

            const reason = resolveLatestOrderFeeRejectRemark(rowData);
            help.addEventListener('mouseenter', () => {
              showFeeRejectHelpTip(help, reason);
            });
            help.addEventListener('mouseleave', () => {
              hideFeeRejectHelpTip();
            });
            wrap.appendChild(help);
          }

          if (modificationCount && modificationCount > 0) {
            const countSpan = document.createElement('span');
            countSpan.textContent = `+${modificationCount}`;
            countSpan.style.color = '#ff4d4f';
            countSpan.style.fontWeight = 'bold';
            countSpan.style.flexShrink = '0';
            countSpan.title = `点击查看 ${modificationCount} 次修改记录`;
            wrap.appendChild(countSpan);
          }

          td.appendChild(wrap);
          return td;
        };
      } else if (
        meta.field === 'creationTime' ||
        meta.field === 'task.auditTime'
      ) {
        hotCol.type = 'text';
        hotCol.readOnly = true;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const formattedDate = formatDateTime(value);
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: #262626; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${formattedDate}</span>`;
          return td;
        };
      } else if (meta.field === 'dataEntryMethod') {
        hotCol.type = 'text';
        hotCol.readOnly = true;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          const label = getDataEntryMethodLabel(value);
          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: #262626; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${label || ''}</span>`;
          return td;
        };
      } else if (
        ['exchangeRate', 'unitPrice', 'amount', 'quantity', 'taxRate'].includes(
          meta.field || '',
        )
      ) {
        hotCol.type = 'numeric';
        // 显示由自定义 renderer 负责；勿再配 pattern/culture（新版 HOT 不支持会报错）
        // ✅ 关键修复：添加自定义 renderer，先清空单元格内容
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          // 先清空单元格内容，防止与编辑器残留内容重叠
          td.innerHTML = '';

          // 根据字段类型格式化显示值
          let displayValue = '';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              if (
                prop === 'exchangeRate' ||
                prop === 'unitPrice' ||
                prop === 'amount'
              ) {
                displayValue = numValue.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
              } else if (prop === 'quantity') {
                displayValue = formatWeightVolumeLocale(numValue) || '0';
              } else if (prop === 'taxRate') {
                displayValue = (numValue * 100).toFixed(2) + '%';
              } else {
                displayValue = value.toString();
              }
            }
          }

          // ✅ 新增：添加省略号样式
          td.innerHTML = `<span style="color: ${displayValue ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${displayValue || '0'}</span>`;
          return td;
        };
      } else if (
        meta.field === 'invoiceBlocked' ||
        meta.field === 'isConfidential'
      ) {
        hotCol.type = 'checkbox';
      } else if (
        [
          'noTaxUnitPrice',
          'noTaxAmount',
          'rqstPaymentAmount',
          'invoicedAmount',
          'orderInvoiceAmount',
          'settledAmount',
        ].includes(meta.field || '')
      ) {
        hotCol.type = 'numeric';
        hotCol.readOnly = true;
        // Handsontable 新版只认 Intl.NumberFormat 选项，不再支持 pattern/culture
        hotCol.numericFormat = {
          style: 'decimal',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        };
      } else if (meta.field === 'statementNum') {
        // 对账单列 - 只读文本，不可编辑；多个对账单号用“，”分割展示
        hotCol.type = 'text';
        hotCol.readOnly = true;
        hotCol.renderer = function (
          this: any,
          instance: any,
          td: HTMLTableCellElement,
          row: number,
          col: number,
          prop: string,
          value: any,
          cellProperties: any,
        ) {
          td.innerHTML = '';
          // 从 statements 数组中获取 statementNum，多个用“，”分割展示
          const currentDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = currentDataSource[row] as any;
          const statementNum = getStatementNumsText(rowData);
          // ✅ 添加省略号样式，title 展示完整对账单号
          td.innerHTML = `<span style="color: ${statementNum ? '#262626' : '#999'}; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;" title="${statementNum}">${statementNum}</span>`;
          return td;
        };
      } else if (meta.field === 'creatorUserName') {
        hotCol.type = 'text';
        hotCol.readOnly = true;
      } else {
        hotCol.type = 'text';
      }

      return hotCol;
    });

    return columns
      .concat(mappedColumns)
      .filter((column) => !fieldPermission.always(String(column.data ?? '')));
  });

  return {
    hotColumns,
  };
}
