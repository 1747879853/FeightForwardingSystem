import { requestClient } from '#/api/request';

/** 附件信息接口（统一格式，用于组件内部和表单绑定） */
export interface Attachment {
  /** 附件 ID */
  attachmentId: number | string;
  /** 文件名 */
  fileName: string;
  /** 文件路径 */
  filePath?: string;
  /** 文件访问 URL */
  url: string;
}

/** 上传响应中单个文件的结果 */
export interface UploadResultItem {
  /** 附件 ID */
  attachmentId: number;
  /** 文件名 */
  fileName: string;
  /** 文件路径 */
  filePath: string;
  /** 文件访问 URL */
  fileUrl: string;
}

/**
 * 上传文件
 * @param formData FormData 对象，包含文件
 * @returns 上传结果数组
 */
export async function uploadFile(
  formData: FormData,
): Promise<UploadResultItem[]> {
  return requestClient.post<UploadResultItem[]>(
    '/upload/UploadFile',
    formData,
    {
      baseURL: '', // 不使用默认的 /api 前缀
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

/**
 * 将上传结果映射为统一的 Attachment 格式
 * @param item 上传响应中的单个文件结果
 * @returns 标准化的附件对象
 */
export function mapResultToAttachment(item: UploadResultItem): Attachment {
  return {
    attachmentId: item.attachmentId,
    fileName: item.fileName,
    filePath: item.filePath,
    url: item.fileUrl,
  };
}
