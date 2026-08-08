/**
 * 海运进口「保存提交」域：表单值 → DTO 组装（纯函数）+ 校验/提交/脏检查编排。
 *
 * buildSeaImportDto 与 sea-import-detail-mapper 的 flattenDetail 互为反向映射。
 * 注意分层：集装箱 `orderCtns` 属于海运进口这一层，不放进 `transportOrder`。
 */
import type { ComputedRef, Ref } from 'vue';

import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { nextTick, ref } from 'vue';

import { message } from 'ant-design-vue';

import { addSeaImport, editSeaImport } from '#/api/sea-import/sea-import-admin';
import { $t } from '#/locales';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import { CARGO_TYPE } from '../data';
import {
  sanitizeOrderCtns,
  sanitizeOrderUsers,
  toDateOnlyString,
} from './sea-import-detail-mapper';

export type BuildSeaImportDtoContext = {
  orderCtns: any[];
  isEdit: boolean;
  editId?: string;
  transportOrderId?: string;
};

/** 表单聚合值 → 海运进口 Add/Edit DTO（纯函数，无副作用） */
export const buildSeaImportDto = (
  values: Record<string, any>,
  ctx: BuildSeaImportDtoContext,
) => {
  const seaImportFields: Record<string, any> = {
    orgId: values.orgId ?? undefined,
    vessel: values.vessel,
    innerVoyno: values.innerVoyno,
    carrierId: values.carrierId ?? undefined,
    polId: values.polId ?? undefined,
    polRemark: values.polRemark,
    podId: values.podId ?? undefined,
    podRemark: values.podRemark,
    clientNum: values.clientNum,
    terminal: values.terminal,
    invoiceNum: values.invoiceNum,
    batchNum: values.batchNum,
    originCountryId: values.originCountryId ?? undefined,
    totalNetWeight: values.totalNetWeight ?? undefined,
    exchangeBillDate: toDateOnlyString(values.exchangeBillDate),
    pickUpDate: toDateOnlyString(values.pickUpDate),
    customsDeclareDate: toDateOnlyString(values.customsDeclareDate),
    transferStationDate: toDateOnlyString(values.transferStationDate),
    freeDays: values.freeDays ?? undefined,
    ctnUseDate: toDateOnlyString(values.ctnUseDate),
    sortId: values.sortId,
    orderCtns: sanitizeOrderCtns(ctx.orderCtns),
  };

  const transportOrderFields: Record<string, any> = {
    orgId: values.orgId ?? undefined,
    commissionNum: values.commissionNum,
    codeSourceId: values.codeSourceId ?? undefined,
    codeServiceId: values.codeServiceId ?? undefined,
    isBusinessLocking: values.isBusinessLocking,
    mblNum: values.mblNum,
    bookingNum: values.bookingNum,
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
    /** 界面上的「到港日期」落在 etd */
    etd: toDateOnlyString(values.etd),
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
    ...seaImportFields,
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

export type UseSeaImportSubmitDeps = {
  formApis: SubmitFormApi[];
  collectCurrentFormValues: () => Promise<Record<string, any>>;
  orderCtns: Ref<any[]>;
  isEdit: ComputedRef<boolean>;
  editId: ComputedRef<string | undefined>;
  transportOrderId: Ref<string | undefined>;
  validateSalesRoleCount: () => boolean;
  validateOrderCtns: () => boolean;
  loadEditData: () => Promise<SeaImportAdminApi.SeaImportDto | undefined>;
  /** 编辑保存成功并重新加载详情后回调，入参为最新详情 DTO */
  onSaved?: (detail: SeaImportAdminApi.SeaImportDto) => void;
  closeTabByKey: (key: string) => Promise<void>;
  getCurrentTabKey: () => string;
  router: { replace: (to: string) => unknown };
};

export function useSeaImportSubmit(deps: UseSeaImportSubmitDeps) {
  const {
    formApis,
    collectCurrentFormValues,
    orderCtns,
    isEdit,
    editId,
    transportOrderId,
    validateSalesRoleCount,
    validateOrderCtns,
    loadEditData,
    onSaved,
    closeTabByKey,
    getCurrentTabKey,
    router,
  } = deps;

  const submitting = ref(false);
  const formSnapshotJson = ref<null | string>(null);

  const buildDto = (values: Record<string, any>) =>
    buildSeaImportDto(values, {
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
    if (!validateSalesRoleCount()) {
      return;
    }
    if (!validateOrderCtns()) {
      return;
    }

    submitting.value = true;
    try {
      const values = await collectCurrentFormValues();
      const dto = buildDto(values);

      if (isEdit.value) {
        await editSeaImport(dto as SeaImportAdminApi.SeaImportEditDto);
        message.success($t('ui.actionMessage.operationSuccess'));
        markListShouldRefresh('SeaImportList');
        markListShouldRefresh('Workspace');
        const savedDetail = await loadEditData();
        if (savedDetail) onSaved?.(savedDetail);
        return;
      }

      const createdId = await addSeaImport(
        dto as SeaImportAdminApi.SeaImportAddDto,
      );
      message.success($t('ui.actionMessage.operationSuccess'));
      markListShouldRefresh('SeaImportList');
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
        ? router.replace(`/sea-imports/${createdIdStr}/edit`)
        : router.replace('/sea-imports'));
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
