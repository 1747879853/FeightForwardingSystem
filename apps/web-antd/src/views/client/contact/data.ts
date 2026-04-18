import { $t } from '#/locales';
import dayjs from 'dayjs';
import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';
import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';
import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import { h } from 'vue';

/**
 * 列表列配置（无操作列，第一列为 radio 单选列）
 */

export function useColumns(
  onActionClick?: OnActionClickFn<ClientContactAdminApi.ClientContactDto>,
): VxeTableGridOptions<ClientContactAdminApi.ClientContactDto>['columns'] {
  return [
    {
      title: $t('seaExport.client.contactPerson.name'),
      field: 'name',
      width: 200,
    },
    {
      title: $t('seaExport.client.contactPerson.mobile'),
      field: 'mobile',
      minWidth: 150,
    },
    {
      title: $t('seaExport.client.contactPerson.email'),
      field: 'email',
      minWidth: 150,
    },
    {
      title: $t('seaExport.client.contactPerson.position'),
      field: 'position',
      width: 150,
    },
    {
      title: $t('seaExport.client.contactPerson.weChat'),
      field: 'weChat',
      width: 150,
    },
    {
      title: $t('seaExport.client.contactPerson.qq'),
      field: 'qq',
      width: 150,
    },
    {
      title: $t('seaExport.client.contactPerson.isDefault'),
      field: 'isDefault',
      width: 150,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.yes'), value: true },
          { color: 'default', label: $t('common.no'), value: false },
        ],
      },
    },
    {
      title: $t('seaExport.client.contactPerson.invoiceEnable'),
      field: 'invoiceEnable',
      width: 150,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.yes'), value: true },
          { color: 'default', label: $t('common.no'), value: false },
        ],
      },
    },
    {
      title: $t('seaExport.client.contactPerson.statementEnable'),
      field: 'statementEnable',
      width: 150,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.yes'), value: true },
          { color: 'default', label: $t('common.no'), value: false },
        ],
      },
    },

    {
      title: $t('auditApproval.task.createTime'),
      field: 'creationTime',
      width: 150,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('seaExport.client.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: $t('seaExport.client.operation'),
      width: 150,
    },
  ];
}

export function useAddFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('seaExport.client.contactPerson.name'),
      rules: 'required',
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'mobile',
      label: $t('seaExport.client.contactPerson.mobile'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('seaExport.client.contactPerson.email'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'position',
      label: $t('seaExport.client.contactPerson.position'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'weChat',
      label: $t('seaExport.client.contactPerson.weChat'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Input',
      fieldName: 'qq',
      label: $t('seaExport.client.contactPerson.qq'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Checkbox',
      fieldName: 'isDefault',
      label: $t('seaExport.client.contactPerson.isDefault'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Checkbox',
      fieldName: 'invoiceEnable',
      label: $t('seaExport.client.contactPerson.invoiceEnable'),
      componentProps: { allowClear: true },
    },
    {
      component: 'Checkbox',
      fieldName: 'statementEnable',
      label: $t('seaExport.client.contactPerson.statementEnable'),
      componentProps: { allowClear: true },
    },
  ];
}
