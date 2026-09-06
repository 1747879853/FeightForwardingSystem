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

// ==================== 单票账单识别费用 ====================

/**
 * 账单识别 - 费用代码（展示用嵌套对象）
 * 未匹配时 id=-1，code/cnName/enName 为账单上的费用项目原文
 */
export interface GeminiBillFeeCodeDto {
  /** 费用代码 id，与外层 feeCodeId 一致；未匹配为 -1 */
  id: number;
  /** 费用代码，未匹配时为账单费用项目原文 */
  code?: null | string;
  /** 中文名称，未匹配时为账单费用项目原文 */
  cnName?: null | string;
  /** 英文名称，未匹配时为账单费用项目原文 */
  enName?: null | string;
}

/**
 * 账单识别 - 币别（展示用嵌套对象，无 id，提交用外层 currencyId）
 */
export interface GeminiBillCurrencyDto {
  /** 币别代码，如 CNY */
  code?: null | string;
  /** 中文名称，未匹配时与 code 相同 */
  cnName?: null | string;
  /** 英文名称，未匹配时与 code 相同 */
  enName?: null | string;
}

/**
 * 账单识别 - 提单号匹配到的业务（恒有值，对不上业务时接口直接报错）
 */
export interface GeminiBillFeeTransportOrderDto {
  /** 业务 id（TransportOrder.Id），也是每条费用的 transportOrderId */
  id: string;
  /** 业务类型：0=海运出口 1=海运进口 2=空运出口 */
  bizType: number;
  /** 委托编号 */
  commissionNum?: null | string;
  /** 主提单号（库里原值） */
  mblNum?: null | string;
}

/**
 * 账单识别 - 单条费用（OrderFeeEditDto 结构，id 恒为 null 表示新增）
 * feeCode / currency 为展示用嵌套对象，提交以后端认的 feeCodeId / currencyId 为准
 */
export interface GeminiBillFeeOrderFeeDto {
  /** 费用 id，恒为 null（新增） */
  id?: null | string;
  /** 收付类型，账单固定为 1（应付） */
  paySide: number;
  /** 更改单 id，恒为 null（记在主单上） */
  changeOrderId?: null | string;
  /** 业务 id，与 transportOrder.id 相同 */
  transportOrderId: string;
  /** 费用代码 id，匹配不到为 -1（须用户改完才能提交） */
  feeCodeId: number;
  /** 结算对象类别，解析不到为 null */
  industryCategory?: null | number;
  /** 结算对象 id，带不到为 null（录入状态允许为空） */
  settlementId?: null | string;
  /** 币别 id，匹配不到为 -1 */
  currencyId: number;
  /** 汇率，对不上为 0 */
  exchangeRate: number;
  /** 含税单价（账单 Rate / 单价列） */
  unitPrice: number;
  /** 不含税单价（按费用代码默认税率反算） */
  noTaxUnitPrice: number;
  /** 金额（unitPrice * quantity，两位小数） */
  amount: number;
  /** 不含税金额（按税率反算） */
  noTaxAmount: number;
  /** 单位（箱型名，如 40HC） */
  unit?: null | string;
  /** 数量（该箱型的箱量） */
  quantity: number;
  /** 税率(%)，未匹配为 0 */
  taxRate: number;
  /** 是否禁开发票，未匹配为 false */
  invoiceBlocked: boolean;
  /** 是否机密，未匹配为 false */
  isConfidential: boolean;
  /** 备注，本接口不填，为 null */
  remark?: null | string;
  /** 费用代码（展示） */
  feeCode?: GeminiBillFeeCodeDto | null;
  /** 结算对象（展示），本接口不回填，为 null */
  settlement?: any | null;
  /** 币别（展示） */
  currency?: GeminiBillCurrencyDto | null;
}

/**
 * 账单识别结果（提单号 → 匹配到的业务 → 费用列表，勿拍平）
 */
export interface GeminiBillFeeExtractDto {
  /** 识别出的提单号（已去空格/横杠并转大写，成功返回时恒有值） */
  mblNum: string;
  /** 提单号匹配到的业务（恒有值） */
  transportOrder: GeminiBillFeeTransportOrderDto;
  /** 费用添加列表，可能为空数组（认到提单号但对不出费用行） */
  orderFees: GeminiBillFeeOrderFeeDto[];
}

/**
 * Gemini 单票账单识别费用
 * 上传船公司/订舱代理的单票账单，识别提单号与费用行并匹配业务，返回费用添加 DTO 列表（不落库）。
 * 本接口不写费用，由用户在前端勾选后再提交到 OrderFeeAdmin/BatchEditAsync。
 * @param file 单票账单文件（pdf/png/jpg/jpeg/webp/heic/heif/gif/bmp/txt/xlsx/xls，上限 20MB）
 * @param transportOrderId 当前业务 id，可选。费用页已打开某一票时传入，账单主提单号须与该票一致；
 *                         列表页不传，由识别出的提单号去匹配业务
 */
export function extractBillFees(file: File, transportOrderId?: string) {
  const formData = new FormData();
  formData.append('file', file);
  if (transportOrderId) {
    formData.append('transportOrderId', String(transportOrderId));
  }

  return requestClient.post<GeminiBillFeeExtractDto>(
    '/services/app/GeminiAdmin/ExtractBillFeesAsync',
    formData,
    {
      timeout: 180_000, // 单证解析通常 10~60 秒，后端超时 180 秒
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}
