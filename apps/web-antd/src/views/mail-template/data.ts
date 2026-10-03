import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { MailTemplateAdminApi } from '#/api/mail-template/mail-template-admin';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: '关键字',
      componentProps: {
        placeholder: '模板名、标题',
        allowClear: true,
      },
    },
    {
      component: 'Select',
      fieldName: 'frightModule',
      label: '适用模块',
      componentProps: {
        allowClear: true,
        options: [],
        placeholder: '请选择',
      },
    },
    {
      component: 'Select',
      fieldName: 'serviceType',
      label: '服务项',
      componentProps: {
        allowClear: true,
        options: [],
        placeholder: '请选择',
      },
    },
    {
      component: 'Select',
      fieldName: 'isEnabled',
      label: '是否启用',
      componentProps: {
        allowClear: true,
        options: [
          { label: '启用', value: true },
          { label: '停用', value: false },
        ],
        placeholder: '请选择',
      },
    },
  ];
}

export function useColumns(options: {
  canDelete: boolean;
  canEdit: boolean;
  moduleName: (value?: null | number) => string;
  onActionClick?: OnActionClickFn<MailTemplateAdminApi.MailTemplateDto>;
  serviceName: (value?: null | number) => string;
}): VxeTableGridOptions<MailTemplateAdminApi.MailTemplateDto>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'name',
      title: '模板名',
      minWidth: 160,
    },
    {
      field: 'frightModule',
      title: '适用模块',
      minWidth: 120,
      formatter: ({ cellValue }) => options.moduleName(cellValue),
    },
    {
      field: 'serviceType',
      title: '服务项',
      minWidth: 120,
      formatter: ({ cellValue }) =>
        cellValue === null || cellValue === undefined
          ? '通用'
          : options.serviceName(cellValue),
    },
    {
      field: 'isEnabled',
      title: '是否启用',
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: '启用', value: true },
          { color: 'default', label: '停用', value: false },
        ],
      },
    },
    {
      field: 'subject',
      title: '标题',
      minWidth: 220,
      showOverflow: 'tooltip',
    },
    {
      field: 'sortId',
      title: '排序',
      minWidth: 80,
    },
    {
      field: 'creatorUserName',
      title: '创建人',
      minWidth: 100,
    },
    {
      field: 'creationTime',
      title: '创建时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'lastModifierUserName',
      title: '修改人',
      minWidth: 100,
    },
    {
      field: 'lastModificationTime',
      title: '修改时间',
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: '邮件模板',
          onClick: options.onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'edit', show: options.canEdit },
          { code: 'delete', show: options.canDelete },
        ],
      },
      field: 'operation',
      fixed: 'right',
      headerAlign: 'center',
      showOverflow: false,
      title: '操作',
      width: 140,
    },
  ].map((column) =>
    column.field && column.field !== 'operation'
      ? { ...column, sortable: false as const }
      : column,
  );
}

export function mapMailTemplateQuery(formValues: Record<string, any>) {
  const params: Record<string, any> = {};
  const keyword = String(formValues.keyword || '').trim();
  if (keyword) {
    params.keyword = keyword;
  }
  if (
    formValues.frightModule !== undefined &&
    formValues.frightModule !== null &&
    formValues.frightModule !== ''
  ) {
    params.frightModule = formValues.frightModule;
  }
  if (
    formValues.serviceType !== undefined &&
    formValues.serviceType !== null &&
    formValues.serviceType !== ''
  ) {
    params.serviceType = formValues.serviceType;
  }
  if (formValues.isEnabled === true || formValues.isEnabled === false) {
    params.isEnabled = formValues.isEnabled;
  }
  return params;
}
