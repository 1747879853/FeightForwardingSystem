/**
 * 发票商品明细合并（纯函数）。
 *
 * 合并键（五字段）：货物名称 + 规格型号 + 单位 + 数量 + 税率。
 * - 键相同：累加金额/不含税/税额，按「金额/数量」重算单价（数量不累加）。
 * - 键不同：新增一行。
 * - 外币申请 → 人民币发票：金额字段乘以汇率。
 */

export type InvoiceGoodsMergeLine = {
  id?: string;
  codeInvoiceId?: number | string;
  codeInvoiceName?: string;
  goodsName?: string;
  specification?: string;
  unit?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  noTaxAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  remark?: string;
  /** 表单侧嵌套对象（已有行） */
  codeInvoice?: { id?: number | string; name?: string };
};

export type InvoiceAppForGoodsMerge = {
  applicationNo?: string;
  currencyId?: number;
  invoiceExchangeRate?: number;
  invoiceApplicationGoodsDtls?: InvoiceGoodsMergeLine[] | null;
};

export type MergeInvoiceGoodsLinesOptions = {
  /** 已有商品行（选费加挂时作为种子；删除后重生时传空） */
  existing?: InvoiceGoodsMergeLine[];
  /** 参与合并的开票申请 */
  applications: InvoiceAppForGoodsMerge[];
  /** 发票币别 id（1 = 人民币） */
  invoiceCurrencyId: number;
  /**
   * 外币→人民币时取汇率。
   * - 加挂合并：通常用表单发票汇率
   * - 删除后重生：通常用申请上的 invoiceExchangeRate
   */
  getExchangeRate: (app: InvoiceAppForGoodsMerge) => number;
  /** 新行解析商品编码 id；不传则沿用来源行的 codeInvoiceId */
  resolveCodeInvoiceId?: (
    goodsName: string,
    codeInvoiceId?: number | string,
  ) => number | string | undefined;
  createId?: () => string;
};

const RMB_CURRENCY_ID = 1;

function defaultCreateId(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 11)}`;
}

/** 从已有行或申请商品行取货物名称 */
export function resolveInvoiceGoodsName(line: InvoiceGoodsMergeLine): string {
  return (
    line.codeInvoice?.name ||
    line.codeInvoiceName ||
    line.goodsName ||
    '未知商品'
  );
}

/** 五字段合并键 */
export function buildInvoiceGoodsMergeKey(line: {
  goodsName: string;
  specification: string;
  unit: string;
  quantity: number;
  taxRate: number;
}): string {
  const { goodsName, specification, unit, quantity, taxRate } = line;
  return `${goodsName}_${specification}_${unit}_${quantity}_${taxRate}`;
}

function normalizeGoodsFields(line: InvoiceGoodsMergeLine) {
  return {
    goodsName: resolveInvoiceGoodsName(line),
    specification: line.specification || '',
    unit: line.unit || '票',
    quantity: line.quantity || 0,
    taxRate: line.taxRate || 0,
  };
}

/**
 * 将开票申请商品明细合并为发票商品行。
 * 无副作用：不读写 UI / message / 网络。
 */
export function mergeInvoiceGoodsLines(
  options: MergeInvoiceGoodsLinesOptions,
): InvoiceGoodsMergeLine[] {
  const {
    existing = [],
    applications,
    invoiceCurrencyId,
    getExchangeRate,
    resolveCodeInvoiceId,
    createId = defaultCreateId,
  } = options;

  const goodsMap = new Map<string, InvoiceGoodsMergeLine>();

  // 1) 种子：已有行
  for (const existingItem of existing) {
    const fields = normalizeGoodsFields(existingItem);
    const mergeKey = buildInvoiceGoodsMergeKey(fields);
    goodsMap.set(mergeKey, { ...existingItem });
  }

  // 2) 合并申请商品
  for (const app of applications) {
    const dtlList = app.invoiceApplicationGoodsDtls;
    if (!dtlList?.length) continue;

    const appCurrencyId = app.currencyId;
    const isAppForeignCurrency = appCurrencyId !== RMB_CURRENCY_ID;

    for (const goods of dtlList) {
      const fields = normalizeGoodsFields(goods);
      const mergeKey = buildInvoiceGoodsMergeKey(fields);

      let convertedAmount = goods.amount || 0;
      let convertedNoTaxAmount = goods.noTaxAmount || 0;
      let convertedTaxAmount = goods.taxAmount || 0;
      let convertedUnitPrice = goods.unitPrice || 0;

      if (isAppForeignCurrency && invoiceCurrencyId === RMB_CURRENCY_ID) {
        const exchangeRate = getExchangeRate(app) || 1;
        convertedAmount = (goods.amount || 0) * exchangeRate;
        convertedNoTaxAmount = (goods.noTaxAmount || 0) * exchangeRate;
        convertedTaxAmount = (goods.taxAmount || 0) * exchangeRate;
        convertedUnitPrice = (goods.unitPrice || 0) * exchangeRate;
      }
      // 不同外币之间：保持原值（选费抽屉按币别分组，正常不应出现）

      const hit = goodsMap.get(mergeKey);
      if (hit) {
        hit.amount = (hit.amount || 0) + convertedAmount;
        hit.noTaxAmount = (hit.noTaxAmount || 0) + convertedNoTaxAmount;
        hit.taxAmount = (hit.taxAmount || 0) + convertedTaxAmount;
        if ((hit.quantity || 0) > 0) {
          hit.unitPrice = (hit.amount || 0) / (hit.quantity || 1);
        }
        continue;
      }

      const codeInvoiceId =
        resolveCodeInvoiceId?.(fields.goodsName, goods.codeInvoiceId) ??
        goods.codeInvoiceId;

      goodsMap.set(mergeKey, {
        id: createId(),
        codeInvoiceId,
        codeInvoiceName: fields.goodsName,
        specification: fields.specification,
        unit: fields.unit,
        quantity: fields.quantity,
        unitPrice: convertedUnitPrice,
        amount: convertedAmount,
        noTaxAmount: convertedNoTaxAmount,
        taxRate: fields.taxRate,
        taxAmount: convertedTaxAmount,
        remark: goods.remark || '',
      });
    }
  }

  return Array.from(goodsMap.values());
}

/**
 * 含税金额 ↔ 税额（Family B / 手工改价共用）。
 * amount 为含税价时：不含税 = amount / (1+r)，税额 = 不含税 * r。
 */
export function calcTaxFromInclusiveAmount(
  amount: number,
  taxRatePercent: number,
): { noTaxAmount: number; taxAmount: number } {
  const rate = (taxRatePercent || 0) / 100;
  const noTaxAmount = amount / (1 + rate);
  const taxAmount = noTaxAmount * rate;
  return { noTaxAmount, taxAmount };
}
