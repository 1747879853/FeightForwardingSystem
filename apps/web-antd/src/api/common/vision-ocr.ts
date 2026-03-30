import { requestClient } from '#/api/request';

export type VisionOcrPdfResult = Record<string, any>;

/**
 * 上传 PDF 并执行 OCR 识别
 */
export const runVisionOcrPdf = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<VisionOcrPdfResult>(
    '/services/app/Test/RunVisionOcrPdf',
    formData,
    {
      timeout: 90_000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
};
