import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { AnnouncementAdminApi } from '#/api/system/announcement-admin';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.announcement.keyword'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.input'),
      },
    },
    {
      component: 'Select',
      fieldName: 'Enable',
      label: $t('system.announcement.enable'),
      componentProps: {
        allowClear: true,
        class: 'w-full',
        options: [
          { label: $t('common.enabled'), value: true },
          { label: $t('common.disabled'), value: false },
        ],
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('system.announcement.name'),
      componentProps: {
        maxLength: 200,
      },
      rules: z.string().min(1, {
        message: $t('ui.formRules.required', [$t('system.announcement.name')]),
      }),
    },
    {
      component: 'Switch',
      fieldName: 'enable',
      label: $t('system.announcement.enable'),
      defaultValue: true,
    },
    {
      component: 'DatePicker',
      fieldName: 'startTime',
      label: $t('system.announcement.startTime'),
      componentProps: {
        class: 'w-full',
        showTime: true,
      },
    },
    {
      component: 'DatePicker',
      fieldName: 'endTime',
      label: $t('system.announcement.endTime'),
      componentProps: {
        class: 'w-full',
        showTime: true,
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'sortId',
      label: $t('system.announcement.sortId'),
      defaultValue: 0,
      componentProps: {
        min: 0,
        precision: 0,
        style: { width: '100%' },
      },
    },
    {
      component: 'Textarea',
      fieldName: 'remark',
      label: $t('system.announcement.remark'),
      componentProps: {
        maxLength: 500,
        rows: 3,
      },
      formItemClass: 'col-span-2',
      rules: z
        .string()
        .max(
          500,
          $t('ui.formRules.maxLength', [$t('system.announcement.remark'), 500]),
        )
        .optional(),
    },
  ];
}

export function useColumns(): VxeTableGridOptions<AnnouncementAdminApi.AnnouncementDto>['columns'] {
  return [
    { type: 'checkbox', width: 48 },
    {
      field: 'name',
      title: $t('system.announcement.name'),
      minWidth: 180,
    },
    {
      field: 'enable',
      title: $t('system.announcement.enable'),
      minWidth: 90,
      cellRender: {
        name: 'CellTag',
        options: [
          { color: 'success', label: $t('common.enabled'), value: true },
          { color: 'default', label: $t('common.disabled'), value: false },
        ],
      },
    },
    {
      field: 'startTime',
      title: $t('system.announcement.startTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'endTime',
      title: $t('system.announcement.endTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'sortId',
      title: $t('system.announcement.sortId'),
      minWidth: 80,
    },
    {
      field: 'remark',
      title: $t('system.announcement.remark'),
      minWidth: 160,
      showOverflow: true,
    },
    {
      field: 'creationTime',
      title: $t('system.announcement.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      field: 'lastModificationTime',
      title: $t('system.announcement.lastModificationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
  ];
}
