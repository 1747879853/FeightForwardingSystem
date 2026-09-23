import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { TenantConfigApi } from '#/api/system/tenant-config';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('system.tenantConfig.keyword'),
      componentProps: {
        placeholder: $t('system.tenantConfig.keywordPlaceholder'),
        allowClear: true,
      },
    },
  ];
}

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.tenantConfig.configName'),
      help: $t('system.tenantConfig.nameHelp'),
      componentProps: {
        maxlength: 256,
        showCount: true,
        placeholder: $t('system.tenantConfig.namePlaceholder'),
      },
      rules: z
        .string()
        .trim()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.tenantConfig.configName'),
          ]),
        })
        .max(
          256,
          $t('ui.formRules.maxLength', [
            $t('system.tenantConfig.configName'),
            256,
          ]),
        )
        .refine((value) => !/^(Abp\.|App\.)/i.test(value), {
          message: $t('system.tenantConfig.nameReservedPrefix'),
        }),
    },
    {
      component: 'Textarea',
      fieldName: 'value',
      label: $t('system.tenantConfig.configValue'),
      help: $t('system.tenantConfig.valueHelp'),
      componentProps: {
        rows: 6,
        placeholder: $t('system.tenantConfig.valuePlaceholder'),
      },
    },
  ];
}

export function useColumns(
  onActionClick?: OnActionClickFn<TenantConfigApi.TenantConfigDto>,
  options?: {
    /** 暂借权限配置 Edit */
    canEdit?: boolean;
    /** 暂借权限配置 Delete */
    canDelete?: boolean;
  },
): VxeTableGridOptions<TenantConfigApi.TenantConfigDto>['columns'] {
  const canEdit = options?.canEdit !== false;
  const canDelete = options?.canDelete !== false;
  const operationOptions = [
    canEdit ? { code: 'edit' as const } : null,
    canDelete ? { code: 'delete' as const, danger: true } : null,
  ].filter(Boolean) as Array<{ code: string; danger?: boolean }>;

  return [
    { type: 'checkbox', width: 48, sortable: false },
    {
      type: 'seq',
      title: $t('common.index'),
      width: 60,
      sortable: false,
    },
    {
      align: 'left',
      field: 'name',
      title: $t('system.tenantConfig.configName'),
      minWidth: 220,
      sortable: false,
      showOverflow: true,
    },
    {
      align: 'left',
      field: 'value',
      title: $t('system.tenantConfig.configValue'),
      minWidth: 240,
      sortable: false,
      showOverflow: true,
    },
    {
      field: 'creatorUserName',
      title: $t('system.tenantConfig.creatorUserName'),
      minWidth: 120,
      sortable: false,
    },
    {
      field: 'creationTime',
      title: $t('system.tenantConfig.creationTime'),
      minWidth: 170,
      formatter: 'formatDateTime',
      sortable: false,
    },
    {
      field: 'lastModifierUserName',
      title: $t('system.tenantConfig.lastModifierUserName'),
      minWidth: 120,
      sortable: false,
    },
    {
      field: 'lastModificationTime',
      title: $t('system.tenantConfig.lastModificationTime'),
      minWidth: 170,
      formatter: 'formatDateTime',
      sortable: false,
    },
    ...(operationOptions.length > 0
      ? [
          {
            align: 'right' as const,
            cellRender: {
              attrs: {
                nameField: 'name',
                nameTitle: $t('system.tenantConfig.name'),
                onClick: onActionClick,
              },
              name: 'CellOperation',
              options: operationOptions,
            },
            field: 'operation',
            fixed: 'right' as const,
            headerAlign: 'center' as const,
            showOverflow: false,
            sortable: false,
            title: $t('system.tenantConfig.operation'),
            width: 150,
          },
        ]
      : []),
  ];
}
