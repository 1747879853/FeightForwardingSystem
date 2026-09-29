import { $t } from '#/locales';

/**
 * 业务类型（海出 / 海进 / 空出 / 件杂货）选项。
 * 跨客户账期、审核、费用锁定、工作台、报表等模块共用，勿再拷贝一份。
 * 自动费用模板等不支持件杂货的场景请自行收窄选项，勿直接改本列表。
 */
export const BusinessTypeOptions = [
  {
    value: 0,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.seaExport'),
    color: '#1890ff',
  },
  {
    value: 1,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.seaImport'),
    color: '#52c41a',
  },
  {
    value: 2,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.airExport'),
    color: '#fa8c16',
  },
  {
    value: 3,
    label: $t('seaExport.client.paymentTerms.BizTypeOptions.breakBulk'),
    color: '#722ed1',
  },
];
