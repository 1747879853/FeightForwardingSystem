<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Modal, Button, message, Tag } from 'ant-design-vue';
import { InvoiceRemarkTemplateApi } from '#/api/Invoice/invoiceRemarkTemplate';
import { resolveOrganizationCompany } from '#/api/system/organization-unit';
import { getCompanyIdByOrgId } from '#/composables/use-my-org';

interface Props {
  visible: boolean;
  // 用于筛选模板的结算单位和币别
  settlementId?: number;
  currencyId?: number;
  currencyCode?: string;
  // 费用明细数据，用于替换占位符
  feeDetails?: any[];
  // 备注模板占位符数据对象
  templateData?: {
    commissionNum: string;
    mblNum: string;
    invoiceExchangeRate: number;
    foreignCurrencyAmount: string;
    rmbAmount: string;
    clientBankName: string;
    clientBankAccount: string;
    orgBankName: string;
    orgBankAccount: string;
  };
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  settlementId: 0,
  currencyId: undefined,
  currencyCode: '',
  feeDetails: () => [],
  templateData: () => ({
    commissionNum: '',
    mblNum: '',
    invoiceExchangeRate: 1,
    foreignCurrencyAmount: '0.00',
    rmbAmount: '0.00',
    clientBankName: '',
    clientBankAccount: '',
    orgBankName: '',
    orgBankAccount: '',
  }),
});

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'use-template', template: string): void;
}>();

// 模态框显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// 加载状态
const loading = ref(false);

// 模板列表数据
const templateList = ref<InvoiceRemarkTemplateApi.InvoiceRemarkTemListDto[]>(
  [],
);

// 可用占位符（与 RemarkTemplateModal 保持一致）
const availablePlaceholders = [
  { label: '委托编号', value: '<委托编号>', example: '12345678' },
  { label: '主提单号', value: '<主提单号>', example: 'ABC123、RED345' },
  { label: '折算汇率', value: '[折算汇率]', example: '6.5' },
  { label: '外币金额(总计)', value: '[外币金额(总计)]', example: '10000.00' },
  {
    label: '人民币金额(总计)',
    value: '[人民币金额(总计)]',
    example: '65000.00',
  },
  { label: '购方银行', value: '[购方银行]', example: '中国银行' },
  { label: '购方账号', value: '[购方账号]', example: '123456789' },
  { label: '销方银行', value: '[销方银行]', example: '工商银行' },
  { label: '销方账号', value: '[销方账号]', example: '987654321' },
];

/** 根据模板和占位符生成示例字符串 */
function generateExampleText(template: string): string {
  if (!template) return '';

  let result = template;

  // 遍历所有可用占位符，用对应的example替换
  availablePlaceholders.forEach((ph) => {
    // 使用正则表达式全局替换所有出现的占位符
    const regex = new RegExp(
      ph.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g',
    );
    result = result.replace(regex, ph.example);
  });

  return result;
}

/** 根据费用数据替换占位符生成实际备注 */
function generateRemarkFromFeeDetails(template: string): string {
  if (!template) return '';

  let result = template;
  const items = props.feeDetails || [];

  // 优先使用传入的 templateData（动态计算的数据）
  if (props.templateData) {
    // 委托编号 - 使用字符串替换方法，避免正则转义问题
    if (props.templateData.commissionNum) {
      const beforeReplace = result;
      result = result
        .split('<委托编号>')
        .join(props.templateData.commissionNum);
    } else {
      console.warn('⚠️ templateData.commissionNum 为空');
    }

    // 主提单号 - 使用字符串替换方法，避免正则转义问题
    if (props.templateData.mblNum) {
      const beforeReplace = result;
      result = result.split('<主提单号>').join(props.templateData.mblNum);
    } else {
      console.warn('⚠️ templateData.mblNum 为空');
    }

    // 发票汇率 - 方括号需要转义
    result = result.replace(
      /\[折算汇率\]/g,
      String(props.templateData.invoiceExchangeRate),
    );

    // 外币金额总计 - 方括号和圆括号都需要转义
    result = result.replace(
      /\[外币金额\(总计\)\]/g,
      props.templateData.foreignCurrencyAmount,
    );

    // 人民币金额总计 - 方括号和圆括号都需要转义
    result = result.replace(
      /\[人民币金额\(总计\)\]/g,
      props.templateData.rmbAmount,
    );

    // 购方银行 - 方括号需要转义
    result = result.replace(/\[购方银行\]/g, props.templateData.clientBankName);

    // 购方账号 - 方括号需要转义
    result = result.replace(
      /\[购方账号\]/g,
      props.templateData.clientBankAccount,
    );

    // 销方银行 - 方括号需要转义
    result = result.replace(/\[销方银行\]/g, props.templateData.orgBankName);

    // 销方账号 - 方括号需要转义
    result = result.replace(/\[销方账号\]/g, props.templateData.orgBankAccount);

    return result;
  }

  // 如果没有 templateData，回退到旧逻辑
  if (items.length === 0) {
    // 如果没有费用数据，返回示例文本
    return generateExampleText(result);
  }

  // 收集委托编号和主提单号
  const commissionNums = new Set<string>();
  const mblNums = new Set<string>();

  // 按币别分组统计金额
  const amountByCurrency: Record<number, { code: string; total: number }> = {};

  items.forEach((item: any) => {
    if (item.commissionNum) {
      commissionNums.add(item.commissionNum);
    }
    if (item.mblNum) {
      mblNums.add(item.mblNum);
    }

    // 统计金额（按币别）
    const currencyId = item.currencyId || props.currencyId;
    const appliedAmount = item.appliedAmount || 0;

    if (!amountByCurrency[currencyId]) {
      amountByCurrency[currencyId] = {
        code: item.currencyCode || 'CNY',
        total: 0,
      };
    }
    amountByCurrency[currencyId].total += appliedAmount;
  });

  // 替换占位符
  // 委托编号 - 使用字符串替换方法，避免正则转义问题
  if (commissionNums.size > 0) {
    result = result
      .split('<委托编号>')
      .join(Array.from(commissionNums).join('、'));
  }

  // 主提单号 - 使用字符串替换方法，避免正则转义问题
  if (mblNums.size > 0) {
    result = result.split('<主提单号>').join(Array.from(mblNums).join('、'));
  }

  // 金额信息
  Object.values(amountByCurrency).forEach(({ code, total }) => {
    if (code === 'CNY') {
      result = result.replace(/\[人民币金额\(总计\)\]/g, total.toFixed(2));
    } else {
      result = result.replace(/\[外币金额\(总计\)\]/g, total.toFixed(2));
    }
  });

  // 其他占位符如果无法从费用中获取，保留原样或使用默认值
  result = result.replace(/\[折算汇率\]/g, '6.5');
  result = result.replace(/\[购方银行\]/g, '待填写');
  result = result.replace(/\[购方账号\]/g, '待填写');
  result = result.replace(/\[销方银行\]/g, '待填写');
  result = result.replace(/\[销方账号\]/g, '待填写');

  return result;
}

/** 加载模板列表 */
async function loadTemplateList() {
  loading.value = true;
  try {
    const params: any = {
      pageIndex: 1,
      pageSize: 1000,
    };

    // 如果有传入归属组织和币别，进行筛选
    if (props.settlementId) {
      params.orgId =
        getCompanyIdByOrgId(props.settlementId) ??
        (await resolveOrganizationCompany(props.settlementId))?.id ??
        props.settlementId;
    }
    if (props.currencyId) {
      params.currencyId = props.currencyId;
    }

    const result = await InvoiceRemarkTemplateApi.getPagedListAsync(params);
    templateList.value = result.items || [];
  } catch (error) {
    console.error('加载模板列表失败:', error);
    message.error('加载模板列表失败');
  } finally {
    loading.value = false;
  }
}

/** 使用模板 */
function handleUse(record: InvoiceRemarkTemplateApi.InvoiceRemarkTemListDto) {
  // 根据是否有费用数据决定是生成实际备注还是使用原始模板
  const finalRemark =
    props.feeDetails && props.feeDetails.length > 0
      ? generateRemarkFromFeeDetails(record.template)
      : record.template;

  // 发送事件给父组件
  emit('use-template', finalRemark);
  message.success('模板已应用到备注字段');
  // 关闭弹窗
  modalVisible.value = false;
}

/** 监听模态框打开 */
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      // 加载模板列表
      await loadTemplateList();
    }
  },
);
</script>

<template>
  <Modal
    v-model:open="modalVisible"
    title="选择备注模板"
    width="900px"
    :footer="null"
    class="remark-template-select-modal"
    :body-style="{ padding: '0' }"
  >
    <div class="rts">
      <section class="rts-tip">
        <span class="rts-tip__indicator" />
        <div class="rts-tip__body">
          <div class="rts-tip__title">使用说明</div>
          <div class="rts-tip__text">
            点击「使用此模板」可将内容填入备注；若当前已有费用数据，系统会自动替换占位符生成实际备注。
          </div>
        </div>
      </section>

      <section class="rts-list-panel">
        <div class="rts-list-panel__head">
          <span class="rts-tip__indicator" />
          <span class="rts-list-panel__title">可选模板</span>
          <span class="rts-count">{{ templateList.length }}</span>
        </div>

        <div class="rts-list">
          <div
            v-for="item in templateList"
            :key="item.id"
            class="rts-card"
            :class="{ 'rts-card--default': item.default }"
          >
            <div class="rts-card__head">
              <div class="rts-card__meta">
                <Tag v-if="item.default" color="orange">默认</Tag>
                <span class="rts-card__name">{{ item.name || '未命名' }}</span>
                <Tag
                  :color="
                    item.currency.code === 'RMB' || item.currency.code === 'CNY'
                      ? 'green'
                      : 'blue'
                  "
                >
                  {{ item.currency.code }}
                </Tag>
              </div>
              <Button
                size="small"
                type="primary"
                class="rts-card__use"
                @click="handleUse(item)"
              >
                使用此模板
              </Button>
            </div>

            <div class="rts-card__block">
              <div class="rts-card__block-label">模板原文</div>
              <div class="rts-card__block-content">
                {{ item.template || '(空模板)' }}
              </div>
            </div>

            <div class="rts-card__block rts-card__block--preview">
              <div class="rts-card__block-label">示例效果（占位符已替换）</div>
              <div class="rts-card__block-content">
                {{ generateExampleText(item.template) }}
              </div>
            </div>
          </div>

          <div v-if="templateList.length === 0 && !loading" class="rts-empty">
            暂无可用的备注模板
          </div>

          <div v-if="loading" class="rts-empty">加载中...</div>
        </div>
      </section>
    </div>
  </Modal>
</template>

<style scoped>
.rts {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 16px 20px;
  background: #f8fafc;
}

.rts-tip {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  background: hsl(var(--primary, 212 100% 45%) / 6%);
  border: 1px solid hsl(var(--primary, 212 100% 45%) / 18%);
  border-radius: 12px;
}

.rts-tip__indicator {
  display: inline-block;
  flex-shrink: 0;
  width: 3px;
  height: 14px;
  margin-top: 3px;
  background: hsl(var(--primary, 212 100% 45%));
  border-radius: 2px;
}

.rts-tip__body {
  min-width: 0;
}

.rts-tip__title {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--primary, 212 100% 35%));
}

.rts-tip__text {
  font-size: 13px;
  line-height: 1.55;
  color: #475569;
}

.rts-list-panel {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.rts-list-panel__head {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.rts-list-panel__head .rts-tip__indicator {
  margin-top: 0;
}

.rts-list-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.rts-count {
  min-width: 22px;
  padding: 0 7px;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  color: hsl(var(--primary, 212 100% 40%));
  text-align: center;
  background: hsl(var(--primary, 212 100% 45%) / 10%);
  border-radius: 999px;
}

.rts-list {
  max-height: 460px;
  padding: 12px 14px 14px;
  overflow-y: auto;
}

.rts-card {
  padding: 12px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.rts-card:last-child {
  margin-bottom: 0;
}

.rts-card:hover {
  border-color: hsl(var(--primary, 212 100% 45%) / 35%);
  box-shadow: 0 4px 12px rgb(15 23 42 / 6%);
}

.rts-card--default {
  background: linear-gradient(180deg, #fffbeb 0%, #fff 55%);
  border-color: #fbbf24;
}

.rts-card__head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.rts-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.rts-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.rts-card__use {
  flex-shrink: 0;
  border-radius: 6px;
}

.rts-card__block {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
}

.rts-card__block:last-child {
  margin-bottom: 0;
}

.rts-card__block--preview {
  background: hsl(var(--primary, 212 100% 45%) / 4%);
  border-color: hsl(var(--primary, 212 100% 45%) / 22%);
  border-style: dashed;
}

.rts-card__block-label {
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.rts-card__block--preview .rts-card__block-label {
  color: hsl(var(--primary, 212 100% 38%));
}

.rts-card__block-content {
  font-size: 13px;
  line-height: 1.65;
  color: #334155;
  word-break: break-all;
  white-space: pre-wrap;
}

.rts-empty {
  padding: 48px 16px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
}
</style>

<style>
.remark-template-select-modal .ant-modal-content {
  overflow: hidden;
  border-radius: 12px;
}

.remark-template-select-modal .ant-modal-header {
  padding: 14px 20px;
  margin: 0;
  border-bottom: 1px solid #f1f5f9;
}

.remark-template-select-modal .ant-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
</style>
