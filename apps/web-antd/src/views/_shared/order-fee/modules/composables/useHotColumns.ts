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
import {
  NEW_ROW_CLASS,
  formatMoney2,
  paintCheckboxCell,
  paintEllipsisCell,
} from '../utils/hot-cell-render';
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
      ) {
        const currentDataSource = Array.isArray(dataSource)
          ? dataSource
          : dataSource.value;
        const currentSelectedRowKeys = Array.isArray(selectedRowKeys)
          ? selectedRowKeys
          : selectedRowKeys.value;

        const rowData = currentDataSource[row];
        const rowKey = (rowData as any)?._rowKey;
        const isSelected = !!(
          rowKey && currentSelectedRowKeys.includes(rowKey)
        );
        return paintCheckboxCell(td, isSelected);
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
          paintEllipsisCell(td, statusLabel || '', { align: 'center' });
          td.style.color = statusColor;
          td.style.fontWeight = 'bold';
          td.style.fontSize = '12px';
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
        ) {
          const actualDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = actualDataSource[row] as any;
          const isNewRow = !rowData?.id || rowData.id === '';

          let displayName = '';
          if (value && typeof value === 'string') {
            const parts = value.split('-');
            displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
          }

          return paintEllipsisCell(td, displayName, {
            placeholder: '请选择',
            extraClass: isNewRow ? NEW_ROW_CLASS : undefined,
          });
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
        ) {
          return paintEllipsisCell(td, value || '', { placeholder: '请选择' });
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
        ) {
          let displayName = '';
          if (value && typeof value === 'string') {
            const parts = value.split('-');
            displayName = parts.length > 1 ? parts.slice(1).join('-') : value;
          }
          return paintEllipsisCell(td, displayName, { placeholder: '请选择' });
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
        ) {
          return paintEllipsisCell(td, value || '', { placeholder: '请选择' });
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
        ) {
          return paintEllipsisCell(td, value || '', { placeholder: '请选择' });
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
        ) {
          return paintEllipsisCell(td, formatMoney2(value) || '0.00', {
            align: 'right',
          });
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
        ) {
          let displayValue = '0';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue)) {
              displayValue = formatWeightVolumeLocale(numValue) || '0';
            }
          }
          return paintEllipsisCell(td, displayValue, { align: 'right' });
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
        ) {
          return paintEllipsisCell(td, formatMoney2(value) || '0.00', {
            align: 'right',
          });
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
        ) {
          return paintEllipsisCell(td, value || '', {
            placeholder: '0.00%',
          });
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
        ) {
          return paintEllipsisCell(td, value || '', { placeholder: '0.00' });
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
        ) {
          return paintEllipsisCell(td, value || '', { placeholder: '0.00' });
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
        ) {
          return paintEllipsisCell(td, value || '');
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
          const reason = rejected
            ? resolveLatestOrderFeeRejectRemark(rowData)
            : '';
          const sig = `${statusValue}|${modificationCount}|${rejected ? 1 : 0}|${reason}`;

          td.style.cursor = 'pointer';
          td.style.textAlign = 'center';
          td.style.verticalAlign = 'middle';
          td.style.overflow = 'hidden';

          // 内容未变则复用 DOM，避免滚动时反复拆装与重复绑监听
          if (td.dataset.feeStatusSig === sig && td.childElementCount > 0) {
            return td;
          }
          td.dataset.feeStatusSig = sig;
          td.replaceChildren();

          const wrap = document.createElement('span');
          wrap.className = 'fee-status-cell';

          const statusSpan = document.createElement('span');
          statusSpan.className = 'fee-status-label';
          statusSpan.textContent = label || '';
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
            // 属性赋值覆盖旧 handler，避免 addEventListener 累积
            help.onmouseenter = () => showFeeRejectHelpTip(help, reason);
            help.onmouseleave = () => hideFeeRejectHelpTip();
            wrap.appendChild(help);
          }

          if (modificationCount && modificationCount > 0) {
            const countSpan = document.createElement('span');
            countSpan.className = 'fee-status-mod-count';
            countSpan.textContent = `+${modificationCount}`;
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
        ) {
          return paintEllipsisCell(td, formatDateTime(value));
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
        ) {
          return paintEllipsisCell(td, getDataEntryMethodLabel(value) || '');
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
        ) {
          let displayValue = '';
          if (value !== null && value !== undefined && value !== '') {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue)) {
              if (
                prop === 'exchangeRate' ||
                prop === 'unitPrice' ||
                prop === 'amount'
              ) {
                displayValue = formatMoney2(numValue);
              } else if (prop === 'quantity') {
                displayValue = formatWeightVolumeLocale(numValue) || '0';
              } else if (prop === 'taxRate') {
                displayValue = `${(numValue * 100).toFixed(2)}%`;
              } else {
                displayValue = String(value);
              }
            }
          }
          return paintEllipsisCell(td, displayValue || '0', { align: 'right' });
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
        ) {
          const currentDataSource = Array.isArray(dataSource)
            ? dataSource
            : dataSource.value;
          const rowData = currentDataSource[row] as any;
          const statementNum = getStatementNumsText(rowData);
          return paintEllipsisCell(td, statementNum, {
            align: 'center',
            title: statementNum,
          });
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
