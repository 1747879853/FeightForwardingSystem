/**
 * 海运出口「保存提交」域：表单值 → DTO 组装（纯函数）+ 校验/重建确认/提交/脏检查编排。
 *
 * buildSeaExportDto 为无副作用纯函数（表单值 + 上下文 → Add/Edit DTO），与
 * sea-export-detail-mapper 的 flattenDetail（详情 → 表单）互为反向映射，便于独立测试。
 * useSeaExportSubmit 承载 submitting 态、多表单校验、编辑重建二次确认、新增/编辑接口调用与脏检查快照。
 */
import type { ComputedRef, Ref } from 'vue';

import { nextTick, ref } from 'vue';

import { message } from 'ant-design-vue';

import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { addSeaExport, editSeaExport } from '#/api/sea-export/sea-export-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import { CARGO_TYPE } from '../data';
import {
  sanitizeOrderCtns,
  sanitizeOrderUsers,
  toDateOnlyString,
  toDateString,
} from './sea-export-detail-mapper';

export type BuildSeaExportDtoContext = {
  orderCtns: any[];
  serviceTypes: SeaExportAdminApi.SeaExportServiceItemDto[];
  isEdit: boolean;
  editId?: string;
  transportOrderId?: number;
};

/** 表单聚合值 → 海运出口 Add/Edit DTO（纯函数，无副作用） */
export const buildSeaExportDto = (
  values: Record<string, any>,
  ctx: BuildSeaExportDtoContext,
) => {
  const seaExportFields: Record<string, any> = {
    blType: values.blType ?? undefined,
    billType: values.billType ?? undefined,
    codeIssueTypeId: values.codeIssueTypeId ?? values.issueType ?? undefined,
    issueType: values.codeIssueTypeId ?? values.issueType ?? undefined,
    vessel: values.vessel,
    innerVoyno: values.innerVoyno,
    carrierId: values.carrierId ?? undefined,
    secondNotifierId: values.secondNotifierId ?? undefined,
    secondNotifierContent: values.secondNotifierContent,
    podAgentId: values.podAgentId ?? undefined,
    podAgentContent: values.podAgentContent,
    bookingAgentId: values.bookingAgentId ?? undefined,
    shipAgentId: values.shipAgentId ?? undefined,
    yardId: values.yardId ?? undefined,
    yardContact: values.yardContact,
    yardEmail: values.yardEmail,
    yardMobile: values.yardMobile,
    yardTel: values.yardTel,
    noBillEnum: values.noBillEnum ?? undefined,
    copyNoBillEnum: values.copyNoBillEnum ?? undefined,
    prepareAtId: values.prepareAtId ?? undefined,
    closingTime: toDateString(values.closingTime),
    closeVgmTime: toDateString(values.closeVgmTime),
    closeDocTime: toDateString(values.closeDocTime),
    closeManifestTime: toDateString(values.closeManifestTime),
    signingTime: toDateString(values.signingTime),
    signingPortId: values.signingPortId ?? undefined,
    podId: values.podId ?? undefined,
    podRemark: values.podRemark,
    polId: values.polId ?? undefined,
    polRemark: values.polRemark,
    poT1Id: values.poT1Id ?? undefined,
    poT1Remark: values.poT1Remark,
    poT2Id: values.poT2Id ?? undefined,
    poT2Remark: values.poT2Remark,
    receivePortId: values.receivePortId ?? undefined,
    receivePortRemark: values.receivePortRemark,
    deliverPortId: values.deliverPortId ?? undefined,
    deliverPortRemark: values.deliverPortRemark,
    sortId: values.sortId,
    serviceTypes: ctx.serviceTypes,
    orgId: values.orgId ?? undefined,
  };

  const transportOrderFields: Record<string, any> = {
    commissionNum: values.commissionNum,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
    contractNum: values.contractNum,
    accountDate: toDateString(values.accountDate),
    settlementDate: toDateString(values.settlementDate),
    codeSourceId: values.codeSourceId ?? undefined,
    isBusinessLocking: values.isBusinessLocking,
    feeLocked: values.feeLocked,
    codeFrtId: values.codeFrtId ?? undefined,
    prepareAtId: values.prepareAtId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    cargoId: values.cargoId ?? undefined,
    tradeTermsType: values.tradeTermsType ?? undefined,
    goodsCompleteTime: toDateOnlyString(values.goodsCompleteTime),
    etd: toDateOnlyString(values.etd),
    atd: toDateOnlyString(values.atd),
    eta: toDateString(values.eta),
    clientId: values.clientId,
    teamId: values.teamId ?? undefined,
    custBrokerId: values.custBrokerId ?? undefined,
    warehouseId: values.warehouseId ?? undefined,
    insuranceId: values.insuranceId ?? undefined,
    consigneeId: values.consigneeId ?? undefined,
    consigneeContent: values.consigneeContent,
    shipperId: values.shipperId ?? undefined,
    shipperContent: values.shipperContent,
    notifierId: values.notifierId ?? undefined,
    notifierContent: values.notifierContent,
    marks: values.marks,
    pkgs: values.pkgs ?? undefined,
    codePackageId: values.codePackageId ?? undefined,
    goodsDes: values.goodsDes,
    kgs: values.kgs,
    cbm: values.cbm,
    internalRemark: values.internalRemark,
    remark: values.remark,
    orderCodeGoodss: (values.orderCodeGoodss ?? [])
      .filter(
        (codeGoodsId: any) => codeGoodsId !== undefined && codeGoodsId !== null,
      )
      .map((codeGoodsId: number) => ({ codeGoodsId })),
    orderCtns: sanitizeOrderCtns(ctx.orderCtns),
    orderUsers: sanitizeOrderUsers(values.orderUsers),
    ...(values.cargoId === CARGO_TYPE.D
      ? {
          dgLevel: values.dgLevel,
          dgNo: values.dgNo,
          dgPageNo: values.dgPageNo,
          dgLabel: values.dgLabel,
          dgPackingCategory: values.dgPackingCategory,
          dgContact: values.dgContact,
          dgTel: values.dgTel,
          dgNetWeight: values.dgNetWeight,
          dgFlashPoint: values.dgFlashPoint,
          dgPackingNo: values.dgPackingNo,
          dgMarinePollution: values.dgMarinePollution,
        }
      : {}),
    ...(values.cargoId === CARGO_TYPE.R
      ? {
          reeferTemperature: values.reeferTemperature,
          reeferVentilation: values.reeferVentilation,
          reeferHumidity: values.reeferHumidity,
          reeferMinTemperature: values.reeferMinTemperature,
          reeferMaxTemperature: values.reeferMaxTemperature,
          reeferTemperatureUnit: values.reeferTemperatureUnit ?? undefined,
          reeferVentOpen: values.reeferVentOpen,
        }
      : {}),
  };

  if (ctx.isEdit && ctx.transportOrderId) {
    (transportOrderFields as any).id = ctx.transportOrderId;
  }

  return {
    ...seaExportFields,
    ...(ctx.isEdit && ctx.editId ? { id: ctx.editId } : {}),
    transportOrder: transportOrderFields,
  };
};

/**
 * 脏检查专用的结构归一化：
 * - 把 `undefined` / `null` / `''` 视为等价的「空」，对象里的空键统一丢弃；
 * - 递归处理对象与数组，数组保序（空元素用 `null` 占位以保留长度语义）；
 * - 对象键排序，避免键顺序差异造成的误判。
 *
 * 仅用于快照比对，不影响实际提交的 DTO。这样「输入后又删空」的文本字段
 * （备注/收货人内容等）不会因为 `undefined`↔`''`↔`null` 的漂移被误判为已修改。
 */
const normalizeForDirtyCheck = (value: any): any => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      const normalized = normalizeForDirtyCheck(item);
      return normalized === undefined ? null : normalized;
    });
  }
  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      const normalized = normalizeForDirtyCheck(value[key]);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }
    return result;
  }
  return value;
};

/** 生成稳定、可比较的快照字符串（空值等价 + 键有序） */
const stableDtoJson = (dto: Record<string, any>): string =>
  JSON.stringify(normalizeForDirtyCheck(dto) ?? {});

type SubmitFormApi = {
  validate: () => Promise<{ valid: boolean }>;
};

export type UseSeaExportSubmitDeps = {
  formApis: {
    party: SubmitFormApi;
    basic: SubmitFormApi;
    shipment: SubmitFormApi;
    port: SubmitFormApi;
    cargoTypeInline: SubmitFormApi;
    cargoMain: SubmitFormApi;
    cargoMetrics: SubmitFormApi;
    cargoRemark: SubmitFormApi;
    cargoDg: SubmitFormApi;
    cargoReefer: SubmitFormApi;
  };
  collectCurrentFormValues: () => Promise<Record<string, any>>;
  orderCtns: Ref<any[]>;
  isEdit: ComputedRef<boolean>;
  editId: ComputedRef<string | undefined>;
  transportOrderId: Ref<number | undefined>;
  getCheckedServiceTypes: () => number[];
  getCheckedServiceTypeItems: () => SeaExportAdminApi.SeaExportServiceItemDto[];
  editHasAnyServiceTask: Ref<boolean>;
  editOriginalPolId: Ref<string>;
  editOriginalServiceTypeSet: Ref<Set<number>>;
  normalizeIdForCompare: (value: unknown) => string;
  confirmServiceTaskRebuild: () => Promise<boolean>;
  validateSalesRoleCount: () => boolean;
  validateRequiredOrderUserAssignee: () => boolean;
  validateServiceBoundOrderUsers: () => boolean;
  validateShipmentDates: () => Promise<boolean>;
  loadEditData: () => Promise<void>;
  closeTabByKey: (key: string) => Promise<void>;
  getCurrentTabKey: () => string;
  router: { replace: (to: string) => unknown };
};

export function useSeaExportSubmit(deps: UseSeaExportSubmitDeps) {
  const {
    formApis,
    collectCurrentFormValues,
    orderCtns,
    isEdit,
    editId,
    transportOrderId,
    getCheckedServiceTypes,
    getCheckedServiceTypeItems,
    editHasAnyServiceTask,
    editOriginalPolId,
    editOriginalServiceTypeSet,
    normalizeIdForCompare,
    confirmServiceTaskRebuild,
    validateSalesRoleCount,
    validateRequiredOrderUserAssignee,
    validateServiceBoundOrderUsers,
    validateShipmentDates,
    loadEditData,
    closeTabByKey,
    getCurrentTabKey,
    router,
  } = deps;

  const submitting = ref(false);
  const formSnapshotJson = ref<string | null>(null);

  const buildDto = (values: Record<string, any>) =>
    buildSeaExportDto(values, {
      orderCtns: orderCtns.value,
      serviceTypes: getCheckedServiceTypeItems(),
      isEdit: isEdit.value,
      editId: editId.value,
      transportOrderId: transportOrderId.value,
    });

  const handleSubmit = async () => {
    const results = await Promise.all([
      formApis.party.validate(),
      formApis.basic.validate(),
      formApis.shipment.validate(),
      formApis.port.validate(),
      formApis.cargoTypeInline.validate(),
      formApis.cargoMain.validate(),
      formApis.cargoMetrics.validate(),
      formApis.cargoRemark.validate(),
      formApis.cargoDg.validate(),
      formApis.cargoReefer.validate(),
    ]);
    if (!results.every((result) => result.valid)) {
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }
    if (!validateSalesRoleCount()) {
      return;
    }
    if (!validateRequiredOrderUserAssignee()) {
      return;
    }
    if (!validateServiceBoundOrderUsers()) {
      return;
    }
    if (!(await validateShipmentDates())) {
      return;
    }

    submitting.value = true;
    const values = await collectCurrentFormValues();
    if (isEdit.value && editHasAnyServiceTask.value) {
      const polChanged =
        normalizeIdForCompare(values.polId) !== editOriginalPolId.value;
      const currentServiceTypeSet = new Set(getCheckedServiceTypes());
      const serviceTypeSetChanged =
        currentServiceTypeSet.size !== editOriginalServiceTypeSet.value.size ||
        [...currentServiceTypeSet].some(
          (serviceType) => !editOriginalServiceTypeSet.value.has(serviceType),
        );
      if (polChanged || serviceTypeSetChanged) {
        const confirmed = await confirmServiceTaskRebuild();
        if (!confirmed) {
          submitting.value = false;
          return;
        }
      }
    }
    const dto = buildDto(values);

    try {
      if (isEdit.value) {
        await editSeaExport(dto as SeaExportAdminApi.SeaExportEditDto);
        message.success($t('ui.actionMessage.operationSuccess'));
        markListShouldRefresh('SeaExportList');
        markListShouldRefresh('Workspace');
        await loadEditData();
      } else {
        const createdId = await addSeaExport(
          dto as SeaExportAdminApi.SeaExportAddDto,
        );
        message.success($t('ui.actionMessage.operationSuccess'));
        markListShouldRefresh('SeaExportList');
        markListShouldRefresh('Workspace');
        const resolvedCreatedId =
          (createdId as any)?.id ?? (createdId as any)?.result ?? createdId;
        const createdIdStr =
          resolvedCreatedId === null || resolvedCreatedId === undefined
            ? ''
            : String(resolvedCreatedId).trim();
        const createTabKey = getCurrentTabKey();
        // 保存成功后跳转前重置脏检查基线，避免触发未保存拦截的二次确认
        await syncFormSnapshot();
        if (createdIdStr) {
          await router.replace(`/sea-exports/${createdIdStr}/edit`);
        } else {
          await router.replace('/sea-exports');
        }
        await closeTabByKey(createTabKey);
      }
    } finally {
      submitting.value = false;
    }
  };

  const syncFormSnapshot = async () => {
    await nextTick();
    const values = await collectCurrentFormValues();
    formSnapshotJson.value = stableDtoJson(buildDto(values));
  };

  const isFormDirty = async () => {
    if (!formSnapshotJson.value) return false;
    const values = await collectCurrentFormValues();
    return stableDtoJson(buildDto(values)) !== formSnapshotJson.value;
  };

  return {
    submitting,
    formSnapshotJson,
    buildDto,
    handleSubmit,
    syncFormSnapshot,
    isFormDirty,
  };
}
