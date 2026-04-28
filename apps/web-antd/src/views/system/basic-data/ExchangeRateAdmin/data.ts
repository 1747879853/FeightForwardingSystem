import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { ExchangeRateAdminApi } from '#/api/system/base-data/exchange-rate-admin';
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';
import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';

// 币种数据缓存（模块级别）
let currencyCache: Map<number, string> | null = null;

/**
 * 初始化币种缓存（在组件 onMounted 时调用）
 */
export async function initCurrencyCache() {
  if (currencyCache) return; // 已加载，避免重复请求

  try {
    const res = await getCurrencyPagedList({
      PageIndex: 1,
      PageSize: 1000, // 获取所有币种
    });

    currencyCache = new Map();
    res.items.forEach((currency: CurrencyAdminApi.CurrencyDto) => {
      // 使用 code 作为显示名称
      currencyCache!.set(
        currency.id,
        currency.code || currency.cnName || String(currency.id),
      );
    });
  } catch (error) {
    console.error('加载币种缓存失败:', error);
    currencyCache = new Map(); // 失败时也初始化为空 Map，避免重复请求
  }
}

/**
 * 根据 currencyId 获取币种名称（同步访问）
 * @param currencyId 币种ID
 * @returns 币种名称，如果未找到则返回 ID 本身
 */
export function formatCurrencyName(currencyId: number | undefined): string {
  if (!currencyId) return '-';

  // 优先从缓存获取
  if (currencyCache && currencyCache.has(currencyId)) {
    return currencyCache.get(currencyId)!;
  }

  // 缓存未加载时返回 ID
  return String(currencyId);
}

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.exchangeRate.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'CurrencySelect',
      fieldName: 'currencyId',
      label: $t('system.basicData.exchangeRate.currencyId'),
      defaultValue: undefined,
      rules: z
        .number({
          required_error: $t('ui.formRules.selectRequired', [
            $t('system.basicData.exchangeRate.currencyId'),
          ]),
        })
        .min(
          1,
          $t('ui.formRules.selectRequired', [
            $t('system.basicData.exchangeRate.currencyId'),
          ]),
        ),
    },
    {
      component: 'InputNumber',
      fieldName: 'drValue',
      label: $t('system.basicData.exchangeRate.drValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'crValue',
      label: $t('system.basicData.exchangeRate.crValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'customValue',
      label: $t('system.basicData.exchangeRate.customValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'calculateValue',
      label: $t('system.basicData.exchangeRate.calculateValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'invoiceValue',
      label: $t('system.basicData.exchangeRate.invoiceValue'),
      componentProps: {
        min: 0,
        precision: 6,
        style: { width: '100%' },
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'startDate',
      label: $t('system.basicData.exchangeRate.startDate'),
      componentProps: {
        style: { width: '100%' },
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'endDate',
      label: $t('system.basicData.exchangeRate.endDate'),
      componentProps: {
        style: { width: '100%' },
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      component: 'Input',
      fieldName: 'localCurrency',
      label: $t('system.basicData.exchangeRate.localCurrency'),
      componentProps: {
        maxLength: 20,
      },
      rules: z
        .string()
        .max(
          20,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.exchangeRate.localCurrency'),
            20,
          ]),
        )
        .optional(),
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.basicData.exchangeRate.enable'),
      defaultValue: true,
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.exchangeRate.sortId'),
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.exchangeRate.remark'),
      formItemClass: 'col-span-2',
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.exchangeRate.remark'),
            500,
          ]),
        )
        .optional(),
    },
  ];
}

/**
 * 获取表格列配置
 */
export function useColumns(
  onActionClick?: OnActionClickFn<ExchangeRateAdminApi.ExchangeRateDto>,
): VxeTableGridOptions<ExchangeRateAdminApi.ExchangeRateDto>['columns'] {
  return [
    {
      field: 'currencyId',
      title: $t('system.basicData.exchangeRate.currencyId'),
      minWidth: 100,
    },
    {
      field: 'drValue',
      title: $t('system.basicData.exchangeRate.drValue'),
      minWidth: 100,
    },
    {
      field: 'crValue',
      title: $t('system.basicData.exchangeRate.crValue'),
      minWidth: 100,
    },
    {
      field: 'customValue',
      title: $t('system.basicData.exchangeRate.customValue'),
      minWidth: 100,
    },
    {
      field: 'calculateValue',
      title: $t('system.basicData.exchangeRate.calculateValue'),
      minWidth: 100,
    },
    {
      field: 'invoiceValue',
      title: $t('system.basicData.exchangeRate.invoiceValue'),
      minWidth: 100,
    },
    {
      field: 'startDate',
      title: $t('system.basicData.exchangeRate.startDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'endDate',
      title: $t('system.basicData.exchangeRate.endDate'),
      minWidth: 120,
      formatter: 'formatDate',
    },
    {
      field: 'enable',
      title: $t('system.basicData.exchangeRate.enable'),
      minWidth: 80,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.enabled'), value: true },
          { color: 'default', label: $t('common.disabled'), value: false },
        ],
      },
    },
    {
      field: 'sortId',
      title: $t('system.basicData.exchangeRate.sortId'),
      minWidth: 80,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.exchangeRate.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'currencyId',
          nameTitle: $t('system.basicData.exchangeRate.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('system.basicData.operation'),
      width: 150,
    },
  ];
}
