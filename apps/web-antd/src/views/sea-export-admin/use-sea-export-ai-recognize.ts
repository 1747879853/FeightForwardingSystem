/**
 * 海运出口 AI 识别回填编排。
 *
 * 负责选文件 → 调用识别接口 → 规范化 → 回填多个子表单 / 箱表 / Select 回显 /
 * 只读信息 / 服务项联动的整条链路。纯规范化策略见 modules/ai-extract-utils.ts。
 */
import type { ComputedRef, Ref } from 'vue';

import { ref } from 'vue';

// aiExtractFileInputRef / handleAiRecognize（点击隐藏 input 的 DOM 触发）留在 form.vue，
// 本 composable 只负责「选中文件后」的识别 → 规范化 → 回填管线。

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
  pickExtractedLabel,
  resolveCitationKeys,
} from './modules/ai-extract-utils';

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
  };

  const applyAiExtractSelectedItems = (
    values: Record<string, any>,
    extractedSchema?: Record<string, unknown>,
  ) => {
    const schema = extractedSchema ?? {};
    const item = (fieldName: string, componentProps: Record<string, any>) => ({
      fieldName,
      componentProps: { ...componentProps, size: 'small' },
    });

    formApis.basic.updateSchema([
      item('clientId', {
        selectedItems: toSelectedItems(
          values.clientId,
          pickExtractedLabel(schema, resolveCitationKeys('clientId')),
        ),
      }),
      item('codeIssueTypeId', {
        selectedItems: toSelectedItems(
          values.codeIssueTypeId,
          pickExtractedLabel(schema, resolveCitationKeys('codeIssueTypeId')),
          'billType',
        ),
      }),
      item('carrierId', {
        selectedItems: toSelectedItems(
          values.carrierId,
          pickExtractedLabel(schema, resolveCitationKeys('carrierId')),
          'cnShortName',
        ),
      }),
      item('shipAgentId', {
        selectedItems: toSelectedItems(
          values.shipAgentId,
          pickExtractedLabel(schema, resolveCitationKeys('shipAgentId')),
        ),
      }),
      item('codeServiceId', {
        selectedItems: toSelectedItems(
          values.codeServiceId,
          pickExtractedLabel(schema, resolveCitationKeys('codeServiceId')),
          'enName',
        ),
      }),
    ]);

    formApis.port.updateSchema([
      item('polId', {
        selectedItems: toPortSelectedItems(
          values.polId,
          pickExtractedLabel(schema, ['起运港名称']),
          pickExtractedLabel(schema, ['起运港代码']),
        ),
      }),
      item('podId', {
        selectedItems: toPortSelectedItems(
          values.podId,
          pickExtractedLabel(schema, ['目的港名称']),
          pickExtractedLabel(schema, ['目的港代码']),
        ),
      }),
      item('deliverPortId', {
        selectedItems: toPortSelectedItems(
          values.deliverPortId,
          pickExtractedLabel(schema, ['交货地名称']),
          pickExtractedLabel(schema, ['交货港代码']),
        ),
      }),
      item('signingPortId', {
        selectedItems: toPortSelectedItems(
          values.signingPortId,
          pickExtractedLabel(schema, resolveCitationKeys('signingPortId')),
        ),
      }),
    ]);

    formApis.cargoMetrics.updateSchema([
      item('codePackageId', {
        selectedItems: toSelectedItems(
          values.codePackageId,
          pickExtractedLabel(schema, resolveCitationKeys('codePackageId')),
        ),
      }),
    ]);
  };

  const handleAiFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (!file) return;

    if (!isAiExtractSupportedFile(file)) {
      message.warning('请上传 PDF 或图片文件（png/jpg/jpeg/bmp/tiff/webp）');
      if (target) target.value = '';
      return;
    }

    aiRecognizing.value = true;
    const hideLoading = message.loading('AI识别中，请稍候...', 0);
    try {
      const result = await extractSeaExportToAddDto(file);
      if (result.extract?.code != null && result.extract.code !== 200) {
        message.error(result.extract.message || 'AI识别失败，请稍后重试');
        return;
      }

      const payload = buildAiExtractFormPayload(result, {
        allowedFields: AI_RECOGNIZE_ALLOWED_FIELDS,
        normalizeValue: normalizeAiFieldValue,
      });
      const recognizedFieldCount = payload.filledFields.length;
      if (recognizedFieldCount === 0) {
        message.warning('识别成功，但没有可回填的字段');
        return;
      }

      applyAiExtractSelectedItems(
        payload.formValues,
        result.extract?.extractedSchema,
      );
      await applyAiRecognizedFormValues(payload.formValues, {
        orderCtnsPayload: payload.orderCtns,
        orderCodeGoodssPayload: payload.orderCodeGoodss,
      });

      message.success(`AI识别完成，已回填 ${recognizedFieldCount} 个字段`);
    } catch {
      message.error('AI识别失败，请稍后重试');
    } finally {
      hideLoading();
      aiRecognizing.value = false;
      if (target) target.value = '';
    }
  };

  return {
    aiRecognizing,
    handleAiFileChange,
  };
}
