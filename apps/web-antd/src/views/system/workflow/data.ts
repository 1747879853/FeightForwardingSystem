import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { VbenFormSchema } from '#/adapter/form';
import type { WorkFlowAdminApi } from '#/api/system/workflow-admin';

import { getTaskTypeOptions } from '#/api/system/workflow-admin';
import { $t } from '#/locales';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'keyword',
      label: $t('system.workflow.keyword'),
      componentProps: {
        allowClear: true,
        placeholder: $t('system.workflow.keyword'),
      },
    },
    {
      component: 'Select',
      fieldName: 'taskType',
      label: $t('system.workflow.taskType'),
      componentProps: {
        allowClear: true,
        options: getTaskTypeOptions().map(({ label, value }) => ({
          label,
          value,
        })),
        placeholder: $t('ui.placeholder.select'),
        class: 'w-full',
      },
    },
  ];
}

export function useColumns<T = WorkFlowAdminApi.WorkFlowDto>(
  onActionClick: OnActionClickFn<T>,
): VxeTableGridOptions['columns'] {
  const taskOpts = getTaskTypeOptions();
  return [
    {
      field: 'name',
      title: $t('system.workflow.name'),
      minWidth: 160,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: taskOpts.map(({ label, value }) => ({
          label,
          value,
        })),
      },
      field: 'taskType',
      title: $t('system.workflow.taskType'),
      width: 120,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.yes'), value: true },
          { color: 'default', label: $t('common.no'), value: false },
        ],
      },
      field: 'enable',
      title: $t('system.workflow.enable'),
      width: 100,
    },
    {
      field: 'creationTime',
      formatter: 'formatDateTime',
      title: $t('system.workflow.creationTime'),
      width: 180,
    },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.workflow.name'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'edit', text: $t('common.edit') },
          { code: 'delete', danger: true, text: $t('common.delete') },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('system.user.operation'),
      width: 140,
    },
  ];
}
