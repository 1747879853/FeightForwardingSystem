import { ClientAdminApi } from '#/api/sea-export/client-admin';
import { $t } from '#/locales';

/** 客户类型枚举选项 */
export const getClientTypeOptions = () => [
  {
    value: ClientAdminApi.ClientType.Peer,
    label: $t('seaExport.client.clientTypeOptions.peer'),
  },
  {
    value: ClientAdminApi.ClientType.DirectCustomer,
    label: $t('seaExport.client.clientTypeOptions.direct'),
  },
];

/** 客户等级枚举选项 */
export const getClientLevelOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.clientLevelOptions.vip1'),
    color: 'warning',
  },
  {
    value: 2,
    label: $t('seaExport.client.clientLevelOptions.A'),
    color: 'success',
  },
  {
    value: 3,
    label: $t('seaExport.client.clientLevelOptions.B'),
    color: 'warning',
  },
  {
    value: 4,
    label: $t('seaExport.client.clientLevelOptions.C'),
    color: 'success',
  },
];

/** 供应商资质等级枚举选项 */
export const getSupplierLevelOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.supplierLevelOptions.level1'),
    color: 'warning',
  },
  {
    value: 2,
    label: $t('seaExport.client.supplierLevelOptions.level2'),
    color: 'success',
  },
  {
    value: 3,
    label: $t('seaExport.client.supplierLevelOptions.level3'),
    color: 'warning',
  },
];
/** 客户来源枚举选项 */
export const getClientSourceOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.sourceOptions.oldCustomerReferral'),
  },
  {
    value: 2,
    label: $t('seaExport.client.sourceOptions.onlineMarketing'),
  },
  {
    value: 3,
    label: $t('seaExport.client.sourceOptions.exhibition'),
  },
  {
    value: 4,
    label: $t('seaExport.client.sourceOptions.socialMedia'),
  },
  {
    value: 5,
    label: $t('seaExport.client.sourceOptions.searchEngine'),
  },
  {
    value: 6,
    label: $t('seaExport.client.sourceOptions.phoneInquiry'),
  },
  {
    value: 7,
    label: $t('seaExport.client.sourceOptions.emailContact'),
  },
  {
    value: 8,
    label: $t('seaExport.client.sourceOptions.industryRecommendation'),
  },
  {
    value: 9,
    label: $t('seaExport.client.sourceOptions.other'),
  },
];

/** 优质航线来源枚举选项 */
export const getLaneIdOptions = () => [
  {
    value: 1,
    label: $t('seaExport.client.laneOptions.asia'),
  },
  {
    value: 2,
    label: $t('seaExport.client.laneOptions.america'),
  },
  {
    value: 3,
    label: $t('seaExport.client.laneOptions.europe'),
  },
  {
    value: 4,
    label: $t('seaExport.client.laneOptions.oceania'),
  },
  {
    value: 5,
    label: $t('seaExport.client.laneOptions.mideast'),
  },
  {
    value: 6,
    label: $t('seaExport.client.laneOptions.africa'),
  },
];

/** 行业类别枚举选项（value 取字母，与后端 IndustryCategory 对应：a 船公司、b 发货人、c 场站、t 码头=20） */
export const getIndustryCategoryOptions = () => [
  // {
  //   key: 1,
  //   value: 'a',
  //   label: $t('seaExport.client.industryCategoryOptions.shipCompany'),
  // },
  {
    key: 2,
    value: 'b',
    label: $t('seaExport.client.industryCategoryOptions.shipper'),
  },
  {
    key: 3,
    value: 'c',
    label: $t('seaExport.client.industryCategoryOptions.terminal'),
  },
  {
    key: 4,
    value: 'd',
    label: $t('seaExport.client.industryCategoryOptions.airline'),
  },
  {
    key: 5,
    value: 'e',
    label: $t('seaExport.client.industryCategoryOptions.consignee'),
  },
  {
    key: 6,
    value: 'f',
    label: $t('seaExport.client.industryCategoryOptions.customsBroker'),
  },
  {
    key: 7,
    value: 'g',
    label: $t('seaExport.client.industryCategoryOptions.expressCompany'),
  },
  {
    key: 8,
    value: 'h',
    label: $t('seaExport.client.industryCategoryOptions.notifyParty'),
  },
  {
    key: 9,
    value: 'i',
    label: $t('seaExport.client.industryCategoryOptions.fleet'),
  },
  {
    key: 10,
    value: 'j',
    label: $t('seaExport.client.industryCategoryOptions.trader'),
  },
  {
    key: 11,
    value: 'k',
    label: $t('seaExport.client.industryCategoryOptions.agent'),
  },
  {
    key: 12,
    value: 'l',
    label: $t('seaExport.client.industryCategoryOptions.other'),
  },
  {
    key: 13,
    value: 'm',
    label: $t('seaExport.client.industryCategoryOptions.supplier'),
  },
  {
    key: 14,
    value: 'n',
    label: $t('seaExport.client.industryCategoryOptions.shippingAgent'),
  },
  {
    key: 15,
    value: 'o',
    label: $t('seaExport.client.industryCategoryOptions.bookingAgent'),
  },
  {
    key: 16,
    value: 'p',
    label: $t('seaExport.client.industryCategoryOptions.entrustingUnit'),
  },
  {
    key: 17,
    value: 'q',
    label: $t('seaExport.client.industryCategoryOptions.warehouse'),
  },
  {
    key: 18,
    value: 'r',
    label: $t('seaExport.client.industryCategoryOptions.insuranceCompany'),
  },
  {
    key: 19,
    value: 's',
    label: $t('seaExport.client.industryCategoryOptions.destinationAgent'),
  },
  {
    key: 20,
    value: 't',
    label: $t('seaExport.client.industryCategoryOptions.wharf'),
  },
  {
    key: 21,
    value: 'u',
    label: $t('seaExport.client.industryCategoryOptions.factory'),
  },
  {
    key: 22,
    value: 'v',
    label: $t('seaExport.client.industryCategoryOptions.personnelAgent'),
  },
];

export const getCustomerIndustryCategoryOptions = () => [
  {
    key: 16,
    value: 'p',
    label: $t('seaExport.client.industryCategoryOptions.entrustingUnit'),
  },
  {
    key: 2,
    value: 'b',
    label: $t('seaExport.client.industryCategoryOptions.shipper'),
  },
  {
    key: 5,
    value: 'e',
    label: $t('seaExport.client.industryCategoryOptions.consignee'),
  },
  {
    key: 21,
    value: 'u',
    label: $t('seaExport.client.industryCategoryOptions.factory'),
  },

];

export const getSupplierIndustryCategoryOptions = () => [
  {
    key: 15,
    value: 'o',
    label: $t('seaExport.client.industryCategoryOptions.bookingAgent'),
  },
  {
    key: 3,
    value: 'c',
    label: $t('seaExport.client.industryCategoryOptions.terminal'),
  },
  {
    key: 20,
    value: 't',
    label: $t('seaExport.client.industryCategoryOptions.wharf'),
  },
  {
    key: 4,
    value: 'd',
    label: $t('seaExport.client.industryCategoryOptions.airline'),
  },
  {
    key: 6,
    value: 'f',
    label: $t('seaExport.client.industryCategoryOptions.customsBroker'),
  },
  {
    key: 7,
    value: 'g',
    label: $t('seaExport.client.industryCategoryOptions.expressCompany'),
  },

  {
    key: 9,
    value: 'i',
    label: $t('seaExport.client.industryCategoryOptions.fleet'),
  },

  {
    key: 14,
    value: 'n',
    label: $t('seaExport.client.industryCategoryOptions.shippingAgent'),
  },

  {
    key: 17,
    value: 'q',
    label: $t('seaExport.client.industryCategoryOptions.warehouse'),
  },
  {
    key: 18,
    value: 'r',
    label: $t('seaExport.client.industryCategoryOptions.insuranceCompany'),
  },
  {
    key: 19,
    value: 's',
    label: $t('seaExport.client.industryCategoryOptions.destinationAgent'),
  },
  {
    key: 22,
    value: 'v',
    label: $t('seaExport.client.industryCategoryOptions.personnelAgent'),
  },
];

/** 是否有效枚举选项 */
export const getEnableOptions = () => [
  {
    value: true,
    label: $t('seaExport.client.enableStatus.enabled'),
    color: 'success',
  },
  {
    value: false,
    label: $t('seaExport.client.enableStatus.disabled'),
    color: 'default',
  },
];

/** 客户合作状态枚举选项 */
export const getCustomerCoopStatusOptions = () => [
  {
    value: 0,
    label: $t('seaExport.client.coopStatus.potential', [
      $t('seaExport.client.clientTypeOptions.customer'),
    ]),
  },
  {
    value: 1,
    label: $t('seaExport.client.coopStatus.formal', [
      $t('seaExport.client.clientTypeOptions.customer'),
    ]),
  },
  {
    value: 2,
    label: $t('seaExport.client.coopStatus.suspendCooperation'),
  },
  {
    value: 3,
    label: $t('seaExport.client.coopStatus.blacklist'),
  },
];

/** 供应商合作状态枚举选项 */
export const getSupplierCoopStatusOptions = () => [
  {
    value: 0,
    label: $t('seaExport.client.coopStatus.potential', [
      $t('seaExport.client.clientTypeOptions.supplier'),
    ]),
  },
  {
    value: 1,
    label: $t('seaExport.client.coopStatus.formal', [
      $t('seaExport.client.clientTypeOptions.supplier'),
    ]),
  },
  {
    value: 2,
    label: $t('seaExport.client.coopStatus.suspendCooperation'),
  },
  {
    value: 3,
    label: $t('seaExport.client.coopStatus.blacklist'),
  },
];

/** 是否失信枚举选项 */
export const getIsDishonestOptions = () => [
  {
    value: true,
    label: $t('seaExport.client.dishonestStatus.dishonest'),
    color: 'error',
  },
  {
    value: false,
    label: $t('seaExport.client.dishonestStatus.honest'),
    color: 'success',
  },
];

/** 是否默认枚举选项 */
export const getDefaultOptions = () => [
  {
    value: true,
    label: $t('seaExport.client.addressOptions.isDefaultOptions.yes'),
    color: 'success',
  },
  {
    value: false,
    label: $t('seaExport.client.addressOptions.isDefaultOptions.no'),
    color: 'default',
  },
];

/** 地址类型枚举选项 */
export const getAddressTypeOptions = () => [
  {
    value: 0,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.office'),
  },
  {
    value: 1,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.shipping'),
  },
  {
    value: 2,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.receiving'),
  },
  {
    value: 3,
    label: $t('seaExport.client.addressOptions.addressTypeOptions.other'),
  },
];
