import { defineStore } from 'pinia';

export const useWorkflowStore = defineStore('workflow', {
  state: () => ({
    tableId: '' as number | string,
    isTried: false,
    promoterDrawer: false,
    flowPermission1: {} as any,
    approverDrawer: false,
    approverConfig1: {} as any,
    copyerDrawer: false,
    copyerConfig1: {} as any,
    conditionDrawer: false,
    conditionsConfig1: {
      conditionNodes: [],
    } as any,
  }),
  actions: {
    setTableId(payload: number | string) {
      this.tableId = payload;
    },
    setIsTried(payload: boolean) {
      this.isTried = payload;
    },
    setPromoter(payload: boolean) {
      this.promoterDrawer = payload;
    },
    setFlowPermission(payload: any) {
      this.flowPermission1 = payload;
    },
    setApprover(payload: boolean) {
      this.approverDrawer = payload;
    },
    setApproverConfig(payload: any) {
      this.approverConfig1 = payload;
    },
    setCopyer(payload: boolean) {
      this.copyerDrawer = payload;
    },
    setCopyerConfig(payload: any) {
      this.copyerConfig1 = payload;
    },
    setCondition(payload: boolean) {
      this.conditionDrawer = payload;
    },
    setConditionsConfig(payload: any) {
      this.conditionsConfig1 = payload;
    },
  },
});
