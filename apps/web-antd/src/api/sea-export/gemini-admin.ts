import { requestClient } from '#/api/request';

/**
 * Gemini AI 智能解析相关接口
 * 包括：海运报价解析、提单数据提取等
 */

// ==================== 海运报价解析相关DTO ====================

/**
 * AI识别运价-箱型价格明细
 */
export interface SeFreiPriceCtnDto {
  /** 箱型名称（原始文本） */
  ctnName: string;
  /** 箱型ID（匹配不到为-1） */
  ctnCodeId: string | number;
  /** 价格 */
  price?: number;
}

/**
 * AI识别运价结果DTO（Gemini/千问通用）
 */
export interface GeminiSeFreiPriceDto {
  /** 目的港名称（原始文本） */
  podName: string;
  /** 目的港ID（匹配不到为-1） */
  podId: string | number;
  /** 是否直航 */
  isDirect?: boolean;
  /** 中转港1名称（原始文本，可空） */
  pot1Name?: string;
  /** 中转港1ID（名称为空则null；有名称但匹配不到为-1） */
  pot1Id?: string | number;
  /** 中转港2名称（原始文本，可空） */
  pot2Name?: string;
  /** 中转港2ID（名称为空则null；有名称但匹配不到为-1） */
  pot2Id?: string | number;
  /** 币别代码 */
  currencyCode: string;
  /** 币别ID（匹配不到为-1） */
  currencyId: string | number;
  /** 有效期开始（ISO 8601格式） */
  validTimeStart?: string;
  /** 有效期结束（ISO 8601格式） */
  validTimeEnd?: string;
  /** 备注 */
  remark?: string;
  /** 箱型价格明细列表 */
  seFreiPriceCtns: SeFreiPriceCtnDto[];
}

// ==================== 海运报价解析接口 ====================

/**
 * Gemini AI识别运价（批量新建）
 * 上传运价报价文件（PDF/图片/Excel等），调用gemini-3.5-flash模型识别运价数据
 * @param file 运价报价文件（支持 pdf/png/jpg/jpeg/webp/heic/heif/gif/bmp/txt/xlsx/xls）
 * @returns AI识别的运价列表
 */
export function extractSeFreiPriceByGemini(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return requestClient.post<GeminiSeFreiPriceDto[]>(
    '/services/app/GeminiAdmin/ExtractSeFreiPriceByPromptAsync',
    formData,
    {
      timeout: 100_000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

/**
 * 通义千问AI识别运价（批量新建）
 * 上传运价报价文件（PDF/图片等），调用qwen-doc-turbo模型识别运价数据
 * @param file 运价报价文件（PDF、图片等）
 * @returns AI识别的运价列表
 */
export function extractSeFreiPriceByQwen(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return requestClient.post<GeminiSeFreiPriceDto[]>(
    '/services/app/QwenAdmin/ExtractSeFreiPriceByPromptAsync',
    formData,
    {
      timeout: 100_000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

// ==================== 提单数据提取相关接口 ====================

/**
 * 提单数据提取结果（动态JSON对象）
 * 字段不固定，根据模型提示词输出
 * 当前提示词要求提取的字段包括：
 * BookingNo、Vessel、Voyage、ContainerNo、Shipper、Consignee、Notify Party、
 * B/L NO、Seal No、Number of containers or packages、Kind of Packages、
 * Description of Goods、Gross Weight、Measurement、Port of Loading、
 * Port of Discharge、Place of Receipt、Place of Delivery、NO.of Packages、
 * Marks、船名、航次、起运港、卸货港、收货地、交货地、船期、船公司、箱型箱量、CNTRTOTAL
 */
export type BillDataExtractionResult = Record<string, any>;

/**
 * 提单数据提取（gemini-3.5-flash）
 * 上传提单PDF文件，提取提单字段
 * @param file 提单PDF文件
 * @returns 动态JSON对象，包含提取的提单字段
 */
export function extractBillData(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return requestClient.post<BillDataExtractionResult>(
    '/services/app/GeminiAdmin/ExtractBillDataAsync',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

/**
 * 提单数据提取-轻量模型（gemini-3.1-flash-lite）
 * 用于与正式接口做效果与速度对比
 * 当前提示词只提取：发货人、收货人、通知人
 * @param file 提单PDF文件
 * @returns 动态JSON对象，包含提取的提单字段
 */
export function extractBillDataBy31FlashLite(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return requestClient.post<BillDataExtractionResult>(
    '/services/app/GeminiAdmin/ExtractBillDataBy31FlashLiteAsync',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // ✅ 单独这个接口 2 分钟
    },
  );
}
