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
 * 上传运价报价文件或直接传入报价文字，调用gemini-3.5-flash模型识别运价数据
 * @param file 运价报价文件（支持 pdf/png/jpg/jpeg/webp/heic/heif/gif/bmp/txt/xlsx/xls），可选
 * @param text 待解析的报价文字内容，可选。与 file 二选一，传了 text 则忽略 file
 * @returns AI识别的运价列表
 */
export function extractSeFreiPriceByGemini(file?: File, text?: string) {
  const formData = new FormData();
  if (text) {
    formData.append('text', text);
  }
  if (file) {
    formData.append('file', file);
  }

  return requestClient.post<GeminiSeFreiPriceDto[]>(
    '/services/app/GeminiAdmin/ExtractSeFreiPriceByPromptAsync',
    formData,
    {
      timeout: 180_000, // 后端超时 180 秒
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
      timeout: 180_000, // 增加超时时间以匹配后端配置
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
      timeout: 180_000, // 统一超时时间
    },
  );
}

// ==================== 发票识别 ====================

/**
 * 发票识别结果
 * 字段识别不到时为 null，前端仅作预填，需用户核对后再保存
 */
export interface GeminiInvoiceDto {
  /** 发票号码（保留原文中的字母与数字；识别不到为 null） */
  invoiceNo?: null | string;
  /** 开票日期（ISO 8601，如 2026-08-15T00:00:00；识别不到为 null） */
  invoiceDate?: null | string;
}

/**
 * Gemini 发票识别
 * 传已上传附件 Id，后端直接读服务器磁盘文件，不发 HTTP 自请求
 * @param attachmentId 附件表主键（大数 ID 原样透传，勿 Number()）
 */
export function extractInvoice(attachmentId: number | string) {
  const formData = new FormData();
  formData.append('attachmentId', String(attachmentId));

  return requestClient.post<GeminiInvoiceDto>(
    '/services/app/GeminiAdmin/ExtractInvoiceAsync',
    formData,
    {
      timeout: 180_000,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}
