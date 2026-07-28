import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type { AttachmentDtlTypeAdminApi } from '#/api/system/attachment-dtl-type-admin';

import { z } from '#/adapter/form';
import { formatModuleTypeLabel } from '#/api/common/lookup';
import { $t } from '#/locales';

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'Keyword',
      label: $t('system.basicData.attachmentDtlType.keyword'),
      componentProps: {
        placeholder: $t('ui.placeholder.input'),
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
      label: $t('system.basicData.attachmentDtlType.typeName'),
      componentProps: {
        maxLength: 100,
      },
      rules: z
        .string()
        .min(1, {
          message: $t('ui.formRules.required', [
            $t('system.basicData.attachmentDtlType.typeName'),
          ]),
        })
        .max(
          100,
          $t('ui.formRules.maxLength', [
            $t('system.basicData.attachmentDtlType.typeName'),
            100,
          ]),
        ),
    },
  ];
}

function formatDefaultModules(
  modules:
    | AttachmentDtlTypeAdminApi.AttachmentDefaultModuleDto[]
    | null
    | undefined,
  moduleTypeLabelMap: Map<number, string>,
): string {
  if (!modules?.length) {
    return '-';
  }
  return modules
    .map((item) => formatModuleTypeLabel(item.moduleType, moduleTypeLabelMap))
    .join('、');
}

/** formatter 每次从 holder.map 读取，避免列闭包捕获空 Map */
export type ModuleTypeLabelMapHolder = {
  map: Map<number, string>;
};

export function useColumns(
  moduleTypeLabelMapHolder: ModuleTypeLabelMapHolder,
  onActionClick?: OnActionClickFn<AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto>,
): VxeTableGridOptions<AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto>['columns'] {
  return [
    {
      field: 'name',
      title: $t('system.basicData.attachmentDtlType.typeName'),
      minWidth: 160,
    },
    {
      field: 'attachmentDefaultModules',
      title: $t('system.basicData.attachmentDtlType.defaultModules'),
      minWidth: 240,
      formatter: ({ row }) =>
        formatDefaultModules(
          row.attachmentDefaultModules,
          moduleTypeLabelMapHolder.map,
        ),
    },
    {
      field: 'creatorUserName',
      title: $t('system.basicData.attachmentDtlType.creatorUserName'),
      minWidth: 120,
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.attachmentDtlType.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'name',
          nameTitle: $t('system.basicData.attachmentDtlType.name'),
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
