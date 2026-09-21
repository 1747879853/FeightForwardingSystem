import type { GroupFieldDef } from '#/components/list-grouping';

export const billGroupFields: GroupFieldDef[] = [
  { value: 3, label: '委托单位', paramKey: 'ClientId' },
  {
    value: 4,
    label: '船公司',
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  {
    value: 9,
    label: '签单方式',
    paramKey: 'CodeIssueTypeId',
    emptyParamKey: 'CodeIssueTypeIdEmpty',
  },
];
