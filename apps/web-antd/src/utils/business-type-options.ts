import { $t } from '#/locales';

/**
 * 业务类型（海出 / 海进 / 空出）选项。
 * 跨客户账期、审核、费用锁定、工作台等模块共用，勿再拷贝一份。
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
];
