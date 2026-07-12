import { requestClient } from '#/api/request';

import {
  PrintExportFormat,
  PrintJsonType,
} from '#/components/print-format/types';

export namespace PrintFormatAdminApi {
  export interface PrintFormatDto {
    id: string;
    name?: string | null;
    printJsonId: string;
    printJsonPrintJsonType: PrintJsonType;
    sortId: number;
    remark?: string | null;
    creationTime?: string;
    creatorUserId?: number | null;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
  }

  export interface PrintFormatQueryDto {
    keyword?: string;
    printJsonId?: string;
    printJsonType?: PrintJsonType;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  export interface PagedList<T> {
    items: T[];
    totalCount: number;
    skipCount?: number;
    maxResultCount?: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface GetPrintFileDto {
    printFormatId: string;
    json: string;
    /** 导出格式，缺省为 PDF（0）；1=Excel，2=Word */
    format?: PrintExportFormat;
  }
}

const API_PREFIX = '/services/app/PrintFormatAdmin';

export function getPrintFormatPagedList(
  params: PrintFormatAdminApi.PrintFormatQueryDto,
) {
  return requestClient.get<
    PrintFormatAdminApi.PagedList<PrintFormatAdminApi.PrintFormatDto>
  >(`${API_PREFIX}/GetPagedListAsync`, {
    params: {
      Keyword: params.keyword,
      PrintJsonId: params.printJsonId,
      PrintJsonType: params.printJsonType,
      PageIndex: params.pageIndex,
      PageSize: params.pageSize,
      Sorting: params.sorting,
    },
  });
}

export function printFormatAsync(data: PrintFormatAdminApi.GetPrintFileDto) {
  return requestClient.post<string>(`${API_PREFIX}/PrintAsync`, data);
}
