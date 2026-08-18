import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';

import { requestClient } from '#/api/request';

export namespace TextInAdminApi {
  export interface TextInBoundingRegionDto {
    pageNumber?: number;
    position?: number[];
    text?: string;
  }

  export interface TextInFieldCitationDto {
    value?: string;
    boundingRegions?: TextInBoundingRegionDto[];
  }

  export interface TextInExtractResultDto {
    code?: number;
    message?: string;
    version?: string;
    duration?: number;
    status?: string;
    extractedSchema?: Record<string, unknown>;
    citations?: Record<string, TextInFieldCitationDto>;
    isFromCache?: boolean;
  }

  export interface SeaExportExtractAddDto {
    seaExport?: SeaExportAdminApi.SeaExportAddDto;
    extract?: TextInExtractResultDto;
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

  export interface SeaImportExtractAddDto {
    seaImport?: SeaImportExtractFormDto;
    extract?: TextInExtractResultDto;
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

  export interface PreOrderExtractAddDto {
    preOrder?: PreOrderExtractFormDto;
    extract?: TextInExtractResultDto;
  }

  export interface AirExportExtractAddDto {
    airExport?: AirExportAdminApi.AirExportAddDto;
    extract?: TextInExtractResultDto;
  }
}

const TEXT_IN_EXTRACT_REQUEST_OPTIONS = {
  timeout: 120_000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
} as const;

/**
 * TextIn 海运出口智能抽取并转换为新建 Dto（含名称→id 匹配）
 */
export const extractSeaExportToAddDto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<TextInAdminApi.SeaExportExtractAddDto>(
    '/services/app/TextInAdmin/ExtractSeaExportToAddDtoAsync',
    formData,
    TEXT_IN_EXTRACT_REQUEST_OPTIONS,
  );
};

/**
 * TextIn 海运进口智能抽取并转换为新建 Dto（含名称→id 匹配）
 * 箱子在 seaImport.orderCtns；到港日期落在 transportOrder.etd；支持同文件缓存。
 */
export const extractSeaImportToAddDto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<TextInAdminApi.SeaImportExtractAddDto>(
    '/services/app/TextInAdmin/ExtractSeaImportToAddDtoAsync',
    formData,
    TEXT_IN_EXTRACT_REQUEST_OPTIONS,
  );
};

/**
 * TextIn 业务联系单智能抽取并转换为新建 Dto（含名称→id 匹配）
 * bizType 须放 form 字段或 query，不可放 JSON body；不传默认海运出口 0。
 */
export const extractPreOrderToAddDto = (file: File, bizType?: number) => {
  const formData = new FormData();
  formData.append('file', file);
  if (bizType != null) {
    formData.append('bizType', String(bizType));
  }
  return requestClient.post<TextInAdminApi.PreOrderExtractAddDto>(
    '/services/app/TextInAdmin/ExtractPreOrderToAddDtoAsync',
    formData,
    TEXT_IN_EXTRACT_REQUEST_OPTIONS,
  );
};

/**
 * TextIn 空运出口智能抽取并转换为新建 Dto（含名称→id 匹配）。
 * 空港匹配 AirPort；货物明细在 airExport.airExportOrderCtns；支持同文件缓存。
 */
export const extractAirExportToAddDto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<TextInAdminApi.AirExportExtractAddDto>(
    '/services/app/TextInAdmin/ExtractAirExportToAddDtoAsync',
    formData,
    TEXT_IN_EXTRACT_REQUEST_OPTIONS,
  );
};
