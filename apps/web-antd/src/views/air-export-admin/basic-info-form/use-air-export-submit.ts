/**
 * 空运出口「保存提交」域：表单值 → DTO 组装（纯函数）+ 校验/提交/脏检查编排。
 *
 * buildAirExportDto 与 air-export-detail-mapper 的 flattenDetail 互为反向映射。
 * 注意分层：货物明细 `airExportOrderCtns` 属于空运出口这一层，不放进 `transportOrder`。
 * 三张子表（货物明细、商品、干系人）都按全量比对处理，**漏传的行会被后端删除**。
 */
import type { ComputedRef, Ref } from 'vue';

import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import { nextTick, ref } from 'vue';

import { message } from 'ant-design-vue';

import { addAirExport, editAirExport } from '#/api/air-export/air-export-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import { CARGO_TYPE } from '../data';
import {
  sanitizeOrderCtns,
  sanitizeOrderUsers,
  toDateOnlyString,
} from './air-export-detail-mapper';

export type BuildAirExportDtoContext = {
  orderCtns: any[];
  isEdit: boolean;
  editId?: string;
  transportOrderId?: string;
};

/** 表单聚合值 → 空运出口 Add/Edit DTO（纯函数，无副作用） */
export const buildAirExportDto = (
  values: Record<string, any>,
  ctx: BuildAirExportDtoContext,
) => {
  const airExportFields: Record<string, any> = {
    orgId: values.orgId ?? undefined,
    bookingAgentId: values.bookingAgentId ?? undefined,
    flightNo: values.flightNo,
    polId: values.polId ?? undefined,
    polRemark: values.polRemark,
    potId: values.potId ?? undefined,
    potRemark: values.potRemark,
    podId: values.podId ?? undefined,
    podRemark: values.podRemark,
    // 算不出来必须传 null，不能退化成 0
    bubbleRatio: values.bubbleRatio ?? null,
    // 这两个日期后端原样保存、不截断时分秒，界面只录日期并按日期串提交，
    // 否则带上时分秒后按「止 = 当天」筛选会漏掉当天的数据
    customsDeclareDate: toDateOnlyString(values.customsDeclareDate),
    deliveryWarehouseDate: toDateOnlyString(values.deliveryWarehouseDate),
    sortId: values.sortId,
    airExportOrderCtns: sanitizeOrderCtns(ctx.orderCtns),
  };

  const transportOrderFields: Record<string, any> = {
    orgId: values.orgId ?? undefined,
    commissionNum: values.commissionNum,
    codeSourceId: values.codeSourceId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    isBusinessLocking: values.isBusinessLocking,
    mblNum: values.mblNum,
    contractNum: values.contractNum,
    internalRemark: values.internalRemark,
    remark: values.remark,
    marks: values.marks,
    goodsDes: values.goodsDes,
    pkgs: values.pkgs ?? undefined,
    codePackageId: values.codePackageId ?? undefined,
    kgs: values.kgs,
    cbm: values.cbm,
    cargoId: values.cargoId ?? undefined,
    goodsCompleteTime: toDateOnlyString(values.goodsCompleteTime),
    /** 界面上的「起飞日期」落在 etd，驱动会计期间与应结日期 */
    etd: toDateOnlyString(values.etd),
    /** 界面上的「实际起飞日期」 */
    atd: toDateOnlyString(values.atd),
    /** 界面上的「预抵日期」 */
    eta: toDateOnlyString(values.eta),
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
    orderCodeGoodss: (values.orderCodeGoodss ?? [])
      .filter(
        (codeGoodsId: any) => codeGoodsId !== undefined && codeGoodsId !== null,
      )
      .map((codeGoodsId: number | string) => ({ codeGoodsId })),
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
    transportOrderFields.id = ctx.transportOrderId;
  }

  return {
    ...airExportFields,
    ...(ctx.isEdit && ctx.editId ? { id: ctx.editId } : {}),
    transportOrder: transportOrderFields,
  };
};

/**
 * 脏检查专用的结构归一化：把 `undefined` / `null` / `''` 视为等价的「空」并丢弃，
 * 对象键排序后再序列化，避免「输入后又删空」被误判为已修改。
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

const stableDtoJson = (dto: Record<string, any>): string =>
  JSON.stringify(normalizeForDirtyCheck(dto) ?? {});

type SubmitFormApi = {
  validate: () => Promise<{ valid: boolean }>;
};

export type UseAirExportSubmitDeps = {
  formApis: SubmitFormApi[];
  collectCurrentFormValues: () => Promise<Record<string, any>>;
  orderCtns: Ref<any[]>;
  isEdit: ComputedRef<boolean>;
  editId: ComputedRef<string | undefined>;
  transportOrderId: Ref<string | undefined>;
  validateOrderUsers: () => boolean;
  loadEditData: () => Promise<void>;
  closeTabByKey: (key: string) => Promise<void>;
  getCurrentTabKey: () => string;
  router: { replace: (to: string) => unknown };
};

export function useAirExportSubmit(deps: UseAirExportSubmitDeps) {
  const {
    formApis,
    collectCurrentFormValues,
    orderCtns,
    isEdit,
    editId,
    transportOrderId,
    validateOrderUsers,
    loadEditData,
    closeTabByKey,
    getCurrentTabKey,
    router,
  } = deps;

  const submitting = ref(false);
  const formSnapshotJson = ref<null | string>(null);

  const buildDto = (values: Record<string, any>) =>
    buildAirExportDto(values, {
      orderCtns: orderCtns.value,
      isEdit: isEdit.value,
      editId: editId.value,
      transportOrderId: transportOrderId.value,
    });

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

  const handleSubmit = async () => {
    const results = await Promise.all(formApis.map((api) => api.validate()));
    if (!results.every((result) => result.valid)) {
      message.warning($t('ui.formRules.pleaseCompleteRequiredFields'));
      return;
    }
    if (!validateOrderUsers()) {
      return;
    }

    submitting.value = true;
    try {
      const values = await collectCurrentFormValues();
      const dto = buildDto(values);

      if (isEdit.value) {
        await editAirExport(dto as AirExportAdminApi.AirExportEditDto);
        message.success($t('ui.actionMessage.operationSuccess'));
        markListShouldRefresh('AirExportList');
        markListShouldRefresh('Workspace');
        await loadEditData();
        return;
      }

      const createdId = await addAirExport(
        dto as AirExportAdminApi.AirExportAddDto,
      );
      message.success($t('ui.actionMessage.operationSuccess'));
      markListShouldRefresh('AirExportList');
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
      await (createdIdStr
        ? router.replace(`/air-exports/${createdIdStr}/edit`)
        : router.replace('/air-exports'));
      await closeTabByKey(createTabKey);
    } finally {
      submitting.value = false;
    }
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
