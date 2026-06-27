import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn } from '#/adapter/vxe-table';
import type {
  GenerateEnum,
  GenerateNumAdminApi,
} from '#/api/system/base-data/generate-num-admin';

import dayjs from 'dayjs';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

/** 编号生成类型常量 */
export const GENERATE_ENUM = {
  AutoNum: 0,
  Text: 1,
  UserName: 2,
  yyyyMMdd: 3,
  yyMMdd: 4,
} as const satisfies Record<string, GenerateEnum>;

export type GenerateNumRulePreviewInput = {
  generateEnum?: GenerateEnum;
  text?: string;
  length?: number;
  sortId?: number;
};

/** 固定字符串：仅 Text(1) 有效 */
export function showRuleTextField(generateEnum?: GenerateEnum) {
  return generateEnum === GENERATE_ENUM.Text;
}

/** 长度：仅 AutoNum(0) 有效 */
export function showRuleLengthField(generateEnum?: GenerateEnum) {
  return generateEnum === GENERATE_ENUM.AutoNum;
}

/** 重置序号：非 AutoNum 有效，AutoNum 上无效 */
export function showRuleResetField(generateEnum?: GenerateEnum) {
  return (
    generateEnum !== undefined &&
    generateEnum !== null &&
    generateEnum !== GENERATE_ENUM.AutoNum
  );
}

export function buildGenerateNumRuleSegment(
  rule: GenerateNumRulePreviewInput,
  options?: { sampleNum?: number; userName?: string },
): string {
  const { sampleNum = 1, userName = '' } = options ?? {};

  switch (rule.generateEnum) {
    case GENERATE_ENUM.AutoNum: {
      const length =
        Number.isInteger(rule.length) && Number(rule.length) > 0
          ? Number(rule.length)
          : 4;
      return String(sampleNum).padStart(length, '0');
    }
    case GENERATE_ENUM.Text:
      return String(rule.text ?? '');
    case GENERATE_ENUM.UserName:
      return userName;
    case GENERATE_ENUM.yyyyMMdd:
      return dayjs().format('YYYYMMDD');
    case GENERATE_ENUM.yyMMdd:
      return dayjs().format('YYMMDD');
    default:
      return '';
  }
}

/** 按列表顺序拼接各段，生成编号预览 */
export function buildGenerateNumPreview(
  rules: GenerateNumRulePreviewInput[],
  options?: { sampleNum?: number; userName?: string },
): string {
  return rules
    .filter(
      (rule) => rule.generateEnum !== undefined && rule.generateEnum !== null,
    )
    .map((rule) => buildGenerateNumRuleSegment(rule, options))
    .join('');
}

export function hasAutoNumRule(rules: GenerateNumRulePreviewInput[]) {
  return rules.some((rule) => rule.generateEnum === GENERATE_ENUM.AutoNum);
}

/** 编号规则可选表名（Entity.Field） */
const TABLE_NAME_VALUES = [
  'SeaExport.CommissionNum',
  'Statement.StatementNum',
  'PaymentApplication.ApplicationNo',
  'PaymentSettlement.SettlementNo',
  'ReceiveSettlement.SettlementNo',
  'BankStatement.BankStatementNo',
  'InvoiceIssue.ApplicationNo',
] as const;

type TableNameValue = (typeof TABLE_NAME_VALUES)[number];

const TABLE_NAME_I18N_PREFIX = 'system.basicData.generateNum.tableNameOptions';

/** 根据表名值获取 i18n 路径 */
function getTableNameI18nKey(value: string) {
  return `${TABLE_NAME_I18N_PREFIX}.${value}`;
}

/** 根据表名值获取显示文案 */
export function getTableNameLabel(value?: string) {
  if (!value) return '';
  const normalized = value.trim();
  if (!TABLE_NAME_VALUES.includes(normalized as TableNameValue)) {
    return normalized;
  }
  const label = $t(getTableNameI18nKey(normalized));
  return label === getTableNameI18nKey(normalized) ? normalized : label;
}

/** 获取表名下拉选项 */
export function getTableNameOptions() {
  return TABLE_NAME_VALUES.map((value) => ({
    value,
    label: getTableNameLabel(value),
  }));
}

/**
 * 获取表格搜索表单的字段配置
 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'tableName',
      label: $t('system.basicData.generateNum.tableName'),
      componentProps: {
        allowClear: true,
        options: getTableNameOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'orgId',
      label: $t('system.basicData.generateNum.orgId'),
      componentProps: {
        allowClear: true,
        placeholder: $t('ui.placeholder.select'),
      },
    },
  ];
}

/**
 * 获取编辑表单的字段配置（主表字段，不含规则明细）
 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      fieldName: 'tableName',
      label: $t('system.basicData.generateNum.tableName'),
      componentProps: {
        allowClear: false,
        class: 'w-full',
        options: getTableNameOptions(),
        placeholder: $t('ui.placeholder.select'),
      },
      rules: z
        .string()
        .min(
          1,
          $t('ui.formRules.required', [
            $t('system.basicData.generateNum.tableName'),
          ]),
        ),
    },
    {
      component: 'Select',
      fieldName: 'applyScope',
      label: $t('system.basicData.generateNum.applyScope'),
      defaultValue: 'none',
      componentProps: {
        allowClear: false,
        class: 'w-full',
        options: [
          {
            label: $t('system.basicData.generateNum.applyScopeOptions.none'),
            value: 'none',
          },
          {
            label: $t('system.basicData.generateNum.applyScopeOptions.org'),
            value: 'org',
          },
          {
            label: $t('system.basicData.generateNum.applyScopeOptions.user'),
            value: 'user',
          },
        ],
      },
    },
    {
      component: 'OrganizationSelect',
      fieldName: 'orgId',
      label: $t('system.basicData.generateNum.orgId'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        appendCodeOnDisplayName: false,
        placeholder: $t('ui.placeholder.select'),
      },
      dependencies: {
        triggerFields: ['applyScope'],
        show: (values) => values.applyScope === 'org',
      },
    },
    {
      component: 'UserSelect',
      fieldName: 'generateNumUserIds',
      label: $t('system.basicData.generateNum.generateNumUsers'),
      formItemClass: 'col-span-2',
      componentProps: {
        allowClear: true,
        mode: 'multiple',
        placeholder: $t('ui.placeholder.select'),
      },
      dependencies: {
        triggerFields: ['applyScope'],
        show: (values) => values.applyScope === 'user',
      },
    },
  ];
}

/** 适用组织/用户为空时表示全局生效 */
export function formatGenerateNumOrgDisplay(
  orgName?: string | null,
  orgId?: number | null,
) {
  const hasOrg = orgId !== null && orgId !== undefined && orgId !== '';
  if (hasOrg) {
    return String(orgName ?? '').trim() || String(orgId);
  }
  return $t('system.basicData.generateNum.applyAll');
}

export function formatGenerateNumUsersDisplay(
  users?: GenerateNumAdminApi.GenerateNumDto['generateNumUsers'],
) {
  const list = Array.isArray(users) ? users : [];
  const labels = list
    .map((item) => item?.nickName || item?.userId)
    .filter(Boolean);
  if (labels.length === 0) {
    return $t('system.basicData.generateNum.applyAll');
  }
  return labels.join('、');
}
export function useColumns(
  onActionClick?: OnActionClickFn<GenerateNumAdminApi.GenerateNumDto>,
): VxeTableGridOptions<GenerateNumAdminApi.GenerateNumDto>['columns'] {
  return [
    {
      field: 'tableName',
      title: $t('system.basicData.generateNum.tableName'),
      minWidth: 200,
      formatter: ({ cellValue }) => getTableNameLabel(cellValue),
    },
    {
      field: 'orgName',
      title: $t('system.basicData.generateNum.orgId'),
      minWidth: 180,
      formatter: ({ cellValue, row }) =>
        formatGenerateNumOrgDisplay(cellValue, row.orgId),
    },
    {
      field: 'generateNumUsers',
      title: $t('system.basicData.generateNum.generateNumUsers'),
      minWidth: 220,
      formatter: ({ cellValue }) => formatGenerateNumUsersDisplay(cellValue),
    },
    {
      field: 'creationTime',
      title: $t('system.basicData.generateNum.creationTime'),
      minWidth: 160,
      formatter: 'formatDateTime',
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'tableNameDisplay',
          nameTitle: $t('system.basicData.generateNum.tableName'),
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
