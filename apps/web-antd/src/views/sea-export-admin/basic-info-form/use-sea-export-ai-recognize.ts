/**
 * 海运出口 AI 识别回填编排。
 *
 * 负责选文件 → 调用识别接口 → 规范化 → 回填多个子表单 / 箱表 / Select 回显 /
 * 只读信息 / 服务项联动的整条链路。纯规范化策略见 ./ai-extract-utils.ts。
 *
 * 上传交互（弹窗拖拽）留在 `ai-extract-upload-modal.vue` / `form.vue`，
 * 本 composable 只负责「拿到 File 之后」的识别 → 规范化 → 回填管线。
 */
import type { ComputedRef, Ref } from 'vue';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { extractSeaExportToAddDto } from '#/api/common';

import {
  normalizeOrderCtnsWithRowKey,
  toPortSelectedItems,
  toSelectedItems,
} from './sea-export-detail-mapper';
import {
  AI_RECOGNIZE_ALLOWED_FIELDS,
  buildAiExtractFormPayload,
  isAiExtractSupportedFile,
  normalizeAiFieldValue,
  splitPortRemark,
} from './ai-extract-utils';

type AiRecognizeFormApi = {
  setValues: (values: Record<string, any>) => Promise<void> | void;
  updateSchema: (schema: any[]) => void;
};

export type UseSeaExportAiRecognizeDeps = {
  formApis: {
    party: AiRecognizeFormApi;
    basic: AiRecognizeFormApi;
    shipment: AiRecognizeFormApi;
    port: AiRecognizeFormApi;
    cargoTypeInline: AiRecognizeFormApi;
    cargoMain: AiRecognizeFormApi;
    cargoMetrics: AiRecognizeFormApi;
    cargoRemark: AiRecognizeFormApi;
    cargoDg: AiRecognizeFormApi;
    cargoReefer: AiRecognizeFormApi;
  };
  orderCtns: Ref<any[]>;
  entrustReadonlyInfo: Ref<Record<string, any>>;
  refreshEntrustReadonlyInfo: (values: Record<string, any>) => void;
  syncTabTitleFromValues: (values: Record<string, any>) => void;
  syncBasicInfoHeaderFields: () => Promise<void> | void;
  applyPartyContacts?: (values: Record<string, any>) => Promise<void> | void;
  isEdit: ComputedRef<boolean>;
  syncServiceTypesByPol: (args: {
    clientId?: unknown;
    force?: boolean;
    polId?: unknown;
  }) => Promise<void> | void;
};

export function useSeaExportAiRecognize(deps: UseSeaExportAiRecognizeDeps) {
  const {
    formApis,
    orderCtns,
    entrustReadonlyInfo,
    refreshEntrustReadonlyInfo,
    syncTabTitleFromValues,
    syncBasicInfoHeaderFields,
    isEdit,
    syncServiceTypesByPol,
    applyPartyContacts,
  } = deps;

  const aiRecognizing = ref(false);

  const applyAiRecognizedFormValues = async (
    values: Record<string, any>,
    options?: {
      orderCtnsPayload?: SeaExportAdminApi.OrderCtnAddDto[];
      orderCodeGoodssPayload?: number[];
    },
  ) => {
    await Promise.all([
      formApis.party.setValues(values),
      formApis.basic.setValues(values),
      formApis.shipment.setValues(values),
      formApis.port.setValues(values),
      formApis.cargoTypeInline.setValues(values),
      formApis.cargoMain.setValues(values),
      formApis.cargoMetrics.setValues(values),
      formApis.cargoRemark.setValues(values),
      formApis.cargoDg.setValues(values),
      formApis.cargoReefer.setValues(values),
    ]);

    if (options?.orderCodeGoodssPayload?.length) {
      await formApis.cargoTypeInline.setValues({
        orderCodeGoodss: options.orderCodeGoodssPayload,
      });
    }

    if (options?.orderCtnsPayload?.length) {
      orderCtns.value = normalizeOrderCtnsWithRowKey(options.orderCtnsPayload);
    }

    refreshEntrustReadonlyInfo({
      ...entrustReadonlyInfo.value,
      commissionNum:
        values.commissionNum ?? entrustReadonlyInfo.value.commissionNum,
      accountDate: values.accountDate ?? entrustReadonlyInfo.value.accountDate,
      settlementDate:
        values.settlementDate ?? entrustReadonlyInfo.value.settlementDate,
    });
    syncTabTitleFromValues(values);
    await syncBasicInfoHeaderFields();

    if (!isEdit.value && (values.polId != null || values.clientId != null)) {
      await syncServiceTypesByPol({
        polId: values.polId,
        clientId: values.clientId,
        force: true,
      });
    }

    await applyPartyContacts?.(values);
  };

  const applyAiExtractSelectedItems = (values: Record<string, any>) => {
    const item = (fieldName: string, componentProps: Record<string, any>) => ({
      fieldName,
      componentProps: { ...componentProps, size: 'small' },
    });
    const pol = splitPortRemark(values.polRemark);
    const pod = splitPortRemark(values.podRemark);

    formApis.basic.updateSchema([
      item('clientId', {
        selectedItems: toSelectedItems(values.clientId, ''),
      }),
      item('codeIssueTypeId', {
        selectedItems: toSelectedItems(values.codeIssueTypeId, '', 'billType'),
      }),
      item('carrierId', {
        selectedItems: toSelectedItems(values.carrierId, '', 'cnShortName'),
      }),
      item('shipAgentId', {
        selectedItems: toSelectedItems(values.shipAgentId, ''),
      }),
      item('codeServiceId', {
        selectedItems: toSelectedItems(values.codeServiceId, '', 'enName'),
      }),
    ]);

    formApis.port.updateSchema([
      item('polId', {
        selectedItems: toPortSelectedItems(
          values.polId,
          pol.portName,
          undefined,
          pol.countryEnName,
        ),
      }),
      item('podId', {
        selectedItems: toPortSelectedItems(
          values.podId,
          pod.portName,
          undefined,
          pod.countryEnName,
        ),
      }),
      item('deliverPortId', {
        selectedItems: toPortSelectedItems(values.deliverPortId, ''),
      }),
      item('signingPortId', {
        selectedItems: toPortSelectedItems(values.signingPortId, ''),
      }),
    ]);

    formApis.cargoMetrics.updateSchema([
      item('codePackageId', {
        selectedItems: toSelectedItems(values.codePackageId, ''),
      }),
    ]);
  };

  /**
   * 对单个文件执行 AI 识别并回填表单。
   * @returns 是否识别并成功回填（无字段可回填视为 false）
   */
  const recognizeAiFile = async (file: File): Promise<boolean> => {
    if (!isAiExtractSupportedFile(file)) {
      message.warning(
        '请上传 PDF、图片（png/jpg/jpeg/bmp/tiff/webp）或 Office 文件（doc/docx/xls/xlsx/rtf）',
      );
      return false;
    }

    if (aiRecognizing.value) return false;

    aiRecognizing.value = true;
    const hideLoading = message.loading('AI识别中，请稍候...', 0);
    try {
      const result = await extractSeaExportToAddDto(file);

      const payload = buildAiExtractFormPayload(result, {
        allowedFields: AI_RECOGNIZE_ALLOWED_FIELDS,
        normalizeValue: normalizeAiFieldValue,
      });
      const recognizedFieldCount = payload.filledFields.length;
      if (recognizedFieldCount === 0) {
        message.warning('识别成功，但没有可回填的字段');
        return false;
      }

      applyAiExtractSelectedItems(payload.formValues);
      await applyAiRecognizedFormValues(payload.formValues, {
        orderCtnsPayload: payload.orderCtns,
        orderCodeGoodssPayload: payload.orderCodeGoodss,
      });

      message.success(`AI识别完成，已回填 ${recognizedFieldCount} 个字段`);
      if (payload.unmatchedCtnCount > 0) {
        message.warning(
          `有 ${payload.unmatchedCtnCount} 条箱型未匹配系统数据，请按识别原文补选箱型`,
        );
      }
      return true;
    } catch {
      return false;
    } finally {
      hideLoading();
      aiRecognizing.value = false;
    }
  };

  return {
    aiRecognizing,
    recognizeAiFile,
  };
}
