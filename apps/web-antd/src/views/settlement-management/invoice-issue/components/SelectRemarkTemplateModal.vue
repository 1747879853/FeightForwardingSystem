<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Modal, Button, message, Space, Tag } from 'ant-design-vue';
import { InvoiceRemarkTemplateApi } from '#/api/Invoice/invoiceRemarkTemplate';
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
    // 委托编号
    if (props.templateData.commissionNum) {
      result = result.replace(
        /\<委托编号\>/g,
        props.templateData.commissionNum,
      );
    }

    // 主提单号
    if (props.templateData.mblNum) {
      result = result.replace(/<主提单号>/g, props.templateData.mblNum);
    }

    // 发票汇率
    result = result.replace(
      /\[折算汇率\]/g,
      String(props.templateData.invoiceExchangeRate),
    );

    // 外币金额总计
    result = result.replace(
      /\[外币金额\(总计\)\]/g,
      props.templateData.foreignCurrencyAmount,
    );

    // 人民币金额总计
    result = result.replace(
      /\[人民币金额\(总计\)\]/g,
      props.templateData.rmbAmount,
    );

    // 购方银行
    result = result.replace(/\[购方银行\]/g, props.templateData.clientBankName);

    // 购方账号
    result = result.replace(
      /\[购方账号\]/g,
      props.templateData.clientBankAccount,
    );

    // 销方银行
    result = result.replace(/\[销方银行\]/g, props.templateData.orgBankName);

    // 销方账号
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
  // 委托编号
  if (commissionNums.size > 0) {
    result = result.replace(
      /\<委托编号\>/g,
      Array.from(commissionNums).join('、'),
    );
  }

  // 主提单号
  if (mblNums.size > 0) {
    result = result.replace(/<主提单号>/g, Array.from(mblNums).join('、'));
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

    // 如果有传入结算单位和币别，进行筛选
    if (props.settlementId) {
      params.orgId = getCompanyIdByOrgId(Number(props.settlementId));
    }
    if (props.currencyId) {
      params.currencyId = props.currencyId;
    }

    const result = await InvoiceRemarkTemplateApi.getPagedListAsync(params);
    templateList.value = result.items || [];

    console.log('加载的模板列表:', templateList.value);
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
    :body-style="{ padding: '16px' }"
  >
    <!-- 提示信息 -->
    <div
      style="
        padding: 12px;
        margin-bottom: 16px;
        background: #e6f7ff;
        border: 1px solid #91d5ff;
        border-radius: 4px;
      "
    >
      <div style="font-size: 13px; color: #0050b3">
        💡
        提示：点击"使用"按钮可将模板内容自动填充到备注字段。如果当前有费用数据，系统将自动替换占位符生成实际备注。
      </div>
    </div>

    <!-- 模板列表 -->
    <div style="max-height: 500px; overflow-y: auto">
      <div
        v-for="item in templateList"
        :key="item.id"
        style="
          padding: 12px;
          margin-bottom: 12px;
          background: #fafafa;
          border: 2px solid #d9d9d9;
          border-radius: 4px;
        "
        :style="{
          backgroundColor: item.default ? '#fffbe6' : '#fafafa',
          borderColor: item.default ? '#faad14' : '#d9d9d9',
        }"
      >
        <div
          style="
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          "
        >
          <div style="display: flex; gap: 8px; align-items: center">
            <Tag v-if="item.default" color="orange">默认</Tag>
            <span style="font-size: 16px; font-weight: bold">
              {{ item.name || '未命名' }}
            </span>
            <Tag :color="item.currency.code === 'RMB' ? 'green' : 'blue'">
              {{ item.currency.code }}
            </Tag>
          </div>
          <Button size="small" type="primary" @click="handleUse(item)">
            使用此模板
          </Button>
        </div>

        <!-- 模板内容预览 -->
        <div
          style="
            padding: 8px;
            margin-bottom: 8px;
            font-size: 13px;
            line-height: 1.6;
            word-break: break-all;
            white-space: pre-wrap;
            background: #fff;
            border: 1px solid #e8e8e8;
            border-radius: 4px;
          "
        >
          <div style="margin-bottom: 4px; font-size: 12px; color: #999">
            模板原文：
          </div>
          {{ item.template || '(空模板)' }}
        </div>

        <!-- 示例效果预览 -->
        <div
          style="
            padding: 8px;
            font-size: 13px;
            line-height: 1.6;
            word-break: break-all;
            white-space: pre-wrap;
            background: #f6ffed;
            border: 1px dashed #b7eb8f;
            border-radius: 4px;
          "
        >
          <div style="margin-bottom: 4px; font-size: 12px; color: #52c41a">
            示例效果（占位符已替换）：
          </div>
          {{ generateExampleText(item.template) }}
        </div>
      </div>

      <div
        v-if="templateList.length === 0 && !loading"
        style="padding: 40px; color: #999; text-align: center"
      >
        暂无可用的备注模板
      </div>

      <div
        v-if="loading"
        style="padding: 40px; color: #999; text-align: center"
      >
        加载中...
      </div>
    </div>
  </Modal>
</template>
