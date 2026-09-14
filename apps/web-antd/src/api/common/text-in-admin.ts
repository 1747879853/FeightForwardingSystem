import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { requestClient } from '#/api/request';

export namespace TextInAdminApi {
  /** 海运出口箱型抽取扩展：带展示用名称，便于未匹配 id 时回显识别原文 */
  export interface OrderCtnExtractAddDto
    extends SeaExportAdminApi.OrderCtnAddDto {
    ctnCodeName?: null | string;
    codePackageName?: null | string;
  }

  /** 海运出口 transportOrder 抽取字段 */
  export interface TransportOrderExtractAddDto extends Omit<
    SeaExportAdminApi.TransportOrderAddDto,
    'orderCtns' | 'orderCodeGoodss' | 'orderUsers'
  > {
    orderCtns?: OrderCtnExtractAddDto[];
    orderCodeGoodss?: SeaExportAdminApi.OrderCodeGoodsAddDto[];
    orderUsers?: SeaExportAdminApi.OrderUserAddDto[];
  }

  /** 海运出口出参（Gemini 直接返回表单对象，无外层包装） */
  export interface SeaExportExtractFormDto extends Partial<
    Pick<
      SeaExportAdminApi.SeaExportAddDto,
      | 'billType'
      | 'blType'
      | 'carrierId'
      | 'codeIssueTypeId'
      | 'deliverPortId'
      | 'deliverPortRemark'
      | 'innerVoyno'
      | 'issueType'
      | 'podId'
      | 'podRemark'
      | 'polId'
      | 'polRemark'
      | 'poT1Id'
      | 'poT1Remark'
      | 'poT2Id'
      | 'poT2Remark'
      | 'receivePortId'
      | 'receivePortRemark'
      | 'shipAgentId'
      | 'signingPortId'
      | 'signingTime'
      | 'terminalVoyno'
      | 'vessel'
    >
  > {
    serviceTypes?: SeaExportAdminApi.SeaExportServiceItemDto[];
    transportOrder?: TransportOrderExtractAddDto;
  }

  /** 海运进口箱型抽取扩展：带展示用名称，便于未匹配 id 时回显识别原文 */
  export interface SeaImportOrderCtnExtractAddDto
    extends SeaImportAdminApi.OrderCtnAddDto {
    ctnCodeName?: null | string;
    codePackageName?: null | string;
  }

  /** 新建海运进口抽取结果：orderCtns 挂在海运进口层 */
  export interface SeaImportExtractFormDto extends Omit<
    SeaImportAdminApi.SeaImportAddDto,
    'orderCtns'
  > {
    orderCtns?: SeaImportOrderCtnExtractAddDto[];
  }

  /** 业务联系单箱型抽取扩展：带箱型名，便于未匹配 id 时回显识别原文 */
  export interface PreOrderCtnExtractAddDto extends Omit<
    PreOrderAdminApi.PreOrderCtnDto,
    'ctnCode' | 'id' | 'preOrderId'
  > {
    ctnCodeName?: null | string;
  }

  /** 新建业务联系单抽取表单：preOrderCtns 为带箱型名的扩展结构 */
  export interface PreOrderExtractFormDto extends Omit<
    PreOrderAdminApi.PreOrderAddDto,
    'preOrderCtns'
  > {
    preOrderCtns?: PreOrderCtnExtractAddDto[];
  }
}

const GEMINI_EXTRACT_REQUEST_OPTIONS = {
  timeout: 120_000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
} as const;

/**
 * Gemini 海运出口智能抽取并转换为新建 Dto（含名称→id 匹配）
 */
export const extractSeaExportToAddDto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<TextInAdminApi.SeaExportExtractFormDto>(
    '/services/app/GeminiAdmin/ExtractSeaExportToAddDtoAsync',
    formData,
    GEMINI_EXTRACT_REQUEST_OPTIONS,
  );
};

/**
 * Gemini 海运进口智能抽取并转换为新建 Dto（含名称→id 匹配）
 * 箱子在 orderCtns；到港日期落在 transportOrder.etd。
 */
export const extractSeaImportToAddDto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<TextInAdminApi.SeaImportExtractFormDto>(
    '/services/app/GeminiAdmin/ExtractSeaImportToAddDtoAsync',
    formData,
    GEMINI_EXTRACT_REQUEST_OPTIONS,
  );
};

/**
 * Gemini 业务联系单智能抽取并转换为新建 Dto（含名称→id 匹配）
 * bizType 须放 form 字段或 query，不可放 JSON body；不传默认海运出口 0。
 */
export const extractPreOrderToAddDto = (file: File, bizType?: number) => {
  const formData = new FormData();
  formData.append('file', file);
  if (bizType != null) {
    formData.append('bizType', String(bizType));
  }
  return requestClient.post<TextInAdminApi.PreOrderExtractFormDto>(
    '/services/app/GeminiAdmin/ExtractPreOrderToAddDtoAsync',
    formData,
    GEMINI_EXTRACT_REQUEST_OPTIONS,
  );
};

/**
 * Gemini 空运出口智能抽取并转换为新建 Dto（含名称→id 匹配）。
 * 空港匹配 AirPort；货物明细在 airExportOrderCtns。
 */
export const extractAirExportToAddDto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<AirExportAdminApi.AirExportAddDto>(
    '/services/app/GeminiAdmin/ExtractAirExportToAddDtoAsync',
    formData,
    GEMINI_EXTRACT_REQUEST_OPTIONS,
  );
};
