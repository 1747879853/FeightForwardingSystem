import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { AirPortAdminApi } from '#/api/system/base-data/air-port-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/** 三字码最大长度，与后端校验一致 */
const IATA_CODE_MAX_LENGTH = 8;
/** 备注最大长度，与后端校验一致 */
const REMARK_MAX_LENGTH = 1024;
/** 时区绝对值上限（不含），与后端校验一致 */
const TIME_ZONE_LIMIT = 100;

const getStatusOptions = () => [
  { color: 'success', label: $t('common.enabled'), value: 0 },
  { color: 'default', label: $t('common.disabled'), value: 1 },
];

const requiredTextRule = (message: string) =>
  z.string({ required_error: message }).trim().min(1, { message });

/** 时区展示为 UTC 偏移，东区带 + 号（如 8 -> UTC+8、5.75 -> UTC+5.75） */
const formatTimeZone = (timeZone: number): string => {
  const value = Number(timeZone);
  if (Number.isNaN(value)) return '';
  return `UTC${value >= 0 ? '+' : ''}${Number.parseFloat(value.toFixed(2))}`;
};

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.airPort.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
        allowClear: true,
      },
    },
    {
      component: 'CountrySelect',
      fieldName: 'CountryId',
      label: $t('system.basicData.airPort.countryId'),
      defaultValue: undefined,
    },
    {
      component: 'Select',
      fieldName: 'Status',
      label: $t('system.basicData.airPort.status'),
      defaultValue: undefined,
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: getStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
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
      component: 'Input',
      fieldName: 'iataCode',
      label: $t('system.basicData.airPort.iataCode'),
      componentProps: {
        allowClear: true,
        maxlength: IATA_CODE_MAX_LENGTH,
      },
      rules: requiredTextRule(
        $t('system.basicData.airPort.iataCodeRequired'),
      ).max(IATA_CODE_MAX_LENGTH, {
        message: $t('system.basicData.airPort.iataCodeMaxLength', [
          IATA_CODE_MAX_LENGTH,
        ]),
      }),
    },
    {
      component: 'Input',
      fieldName: 'enName',
      label: $t('system.basicData.airPort.enName'),
      componentProps: { allowClear: true },
      rules: requiredTextRule($t('system.basicData.airPort.enNameRequired')),
    },
    {
      component: 'Input',
      fieldName: 'cnName',
      label: $t('system.basicData.airPort.cnName'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'icaoCode',
      label: $t('system.basicData.airPort.icaoCode'),
      componentProps: { allowClear: true },
    },
    {
      component: 'CountrySelect',
      fieldName: 'countryId',
      label: $t('system.basicData.airPort.countryId'),
      defaultValue: undefined,
    },
    {
      component: 'Input',
      fieldName: 'city',
      label: $t('system.basicData.airPort.city'),
      componentProps: { allowClear: true },
    },
    {
      component: 'InputNumber',
      fieldName: 'timeZone',
      label: $t('system.basicData.airPort.timeZone'),
      help: $t('system.basicData.airPort.timeZoneHelp'),
      componentProps: {
        max: TIME_ZONE_LIMIT - 0.01,
        min: -(TIME_ZONE_LIMIT - 0.01),
        precision: 2,
        step: 0.25,
        style: { width: '100%' },
      },
    },
    {
      component: 'Select',
      fieldName: 'status',
      label: $t('system.basicData.airPort.status'),
      defaultValue: 0,
      componentProps: {
        class: 'w-full',
        options: getStatusOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
      },
      rules: z.number({
        required_error: $t('system.basicData.airPort.statusRequired'),
      }),
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.basicData.airPort.sortId'),
      defaultValue: 0,
      help: $t('system.basicData.airPort.sortIdHelp'),
      componentProps: {
        precision: 0,
        style: { width: '100%' },
      },
      rules: z.number({
        required_error: $t('system.basicData.airPort.sortIdRequired'),
      }),
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.basicData.airPort.remark'),
      componentProps: {
        allowClear: true,
        maxlength: REMARK_MAX_LENGTH,
        rows: 3,
        showCount: true,
      },
    },
  ];
}

/**
 * 获取表格列配置
 *
 * 后端固定按 SortId 降序、Id 降序返回，不接受前端指定排序字段，故所有列关闭排序
 */
export function useColumns(
  onActionClick?: OnActionClickFn<AirPortAdminApi.AirPortDto>,
): VxeTableGridOptions<AirPortAdminApi.AirPortDto>['columns'] {
  return [
    {
      field: 'iataCode',
      title: $t('system.basicData.airPort.iataCode'),
      minWidth: 100,
      sortable: false,
    },
    {
      field: 'cnName',
      title: $t('system.basicData.airPort.cnName'),
      minWidth: 180,
      sortable: false,
    },
    {
      field: 'enName',
      title: $t('system.basicData.airPort.enName'),
      minWidth: 220,
      sortable: false,
    },
    {
      field: 'icaoCode',
      title: $t('system.basicData.airPort.icaoCode'),
      minWidth: 100,
      sortable: false,
    },
    {
      field: 'countryName',
      title: $t('system.basicData.airPort.countryName'),
      minWidth: 140,
      sortable: false,
      formatter: ({ row }) => row.country?.countryName ?? '',
    },
    {
      field: 'city',
      title: $t('system.basicData.airPort.city'),
      minWidth: 120,
      sortable: false,
    },
    {
      field: 'timeZone',
      title: $t('system.basicData.airPort.timeZone'),
      minWidth: 100,
      sortable: false,
      formatter: ({ row }) =>
        row.timeZone === null || row.timeZone === undefined
          ? ''
          : formatTimeZone(row.timeZone),
    },
    {
      field: 'status',
      title: $t('system.basicData.airPort.status'),
      minWidth: 90,
      sortable: false,
      cellRender: {
        name: 'CellTag',
        options: getStatusOptions(),
      },
    },
    {
      field: 'sortId',
      title: $t('system.basicData.airPort.sortId'),
      minWidth: 90,
      sortable: false,
    },
    {
      field: 'remark',
      title: $t('system.basicData.airPort.remark'),
      minWidth: 160,
      sortable: false,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.airPort.creationTime'),
      minWidth: 160,
      sortable: false,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'cnName',
          nameFieldFallbacks: ['enName', 'iataCode'],
          nameTitle: $t('system.basicData.airPort.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      sortable: false,
      title: $t('system.basicData.operation'),
      width: 150,
    },
  ];
}
