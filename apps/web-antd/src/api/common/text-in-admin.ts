import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

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
}

/**
 * TextIn 海运出口智能抽取并转换为新建 Dto（含名称→id 匹配）
 */
export const extractSeaExportToAddDto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<TextInAdminApi.SeaExportExtractAddDto>(
    '/services/app/TextInAdmin/ExtractSeaExportToAddDtoAsync',
    formData,
    {
      timeout: 120_000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
};
