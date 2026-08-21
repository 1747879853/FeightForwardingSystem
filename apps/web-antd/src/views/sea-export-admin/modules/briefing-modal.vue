<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { Button, Input, Modal, Select, Tooltip, message } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import {
  getQuickTextList,
  type QuickTextApi,
} from '#/api/quick-text/quick-text';
import { QuickTextBizType } from '#/api/quick-text/quick-text-admin';
import QuickTextConfigModal from './quick-text-config-modal.vue';

defineOptions({
  name: 'BriefingModal',
});

const props = defineProps<{
  open: boolean;
  bizType?: QuickTextBizType;
  formData?: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm', content: string): void;
}>();

const modalOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

// 快捷文本列表
const quickTextList = ref<QuickTextApi.QuickTextListItemDto[]>([]);
const loading = ref(false);

// 选中的模板 ID
const selectedTemplateId = ref<string | undefined>();

// 生成的内容
const generatedContent = ref('');

// 配置弹窗显示状态
const configModalOpen = ref(false);

// 当前选中的模板
const selectedTemplate = computed(() => {
  return quickTextList.value.find(
    (item) => item.id === selectedTemplateId.value,
  );
});

// 加载快捷文本列表
const loadQuickTextList = async () => {
  if (props.bizType === undefined || props.bizType === null) {
    return;
  }

  loading.value = true;
  try {
    const result = await getQuickTextList(props.bizType);
    quickTextList.value = result;

    // 如果有默认项，自动选中
    const defaultItem = result.find((item) => item.default);
    if (defaultItem) {
      selectedTemplateId.value = defaultItem.id;
    } else if (result.length > 0) {
      selectedTemplateId.value = result[0].id;
    }
  } catch (error) {
    console.error('加载快捷文本失败:', error);
    message.error('加载快捷文本失败');
  } finally {
    loading.value = false;
  }
};

// 监听弹窗打开，加载数据
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      loadQuickTextList();
    }
  },
);

// 监听选中模板变化，生成内容
watch(selectedTemplateId, () => {
  generateContent();
});

// 监听表单数据变化，重新生成内容
watch(
  () => props.formData,
  () => {
    if (props.open) {
      generateContent();
    }
  },
  { deep: true },
);

// 生成内容（替换占位符）
const generateContent = () => {
  const template = selectedTemplate.value;
  if (!template || !template.text) {
    generatedContent.value = '';
    return;
  }

  let content = template.text;
  const formData = props.formData || {};

  // 辅助函数：安全获取嵌套对象的名称
  const getName = (obj: any): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    // 尝试多种可能的名称字段
    return (
      obj.name ||
      obj.cnName ||
      obj.enName ||
      obj.fullName ||
      obj.shortName ||
      ''
    );
  };

  // 辅助函数：格式化日期
  const formatDate = (date: any): string => {
    if (!date) return '';
    try {
      return dayjs(date).format('YYYY-MM-DD');
    } catch {
      return String(date);
    }
  };

  // 辅助函数：获取值，支持多种可能的字段名
  const getValue = (...keys: string[]): any => {
    for (const key of keys) {
      if (
        formData[key] !== undefined &&
        formData[key] !== null &&
        formData[key] !== ''
      ) {
        return formData[key];
      }
    }
    return undefined;
  };

  // 海运出口占位符映射关系
  // 注意：这里的字段名需要根据实际的表单 schema 进行调整
  const placeholderMap: Record<string, any> = {
    // 编号类
    委托编号: formData.commissionNum,
    主提单号: formData.mblNum,
    订舱编号: getValue('bookingNo', 'bookingNumber', 'orderNo'),
    合同号: getValue('contractNo', 'contractNumber'),

    // 单位类
    委托单位全称:
      formData.clientName ||
      getName(formData.client) ||
      getName(formData.clientId) ||
      formData.clientId,
    订舱代理全称:
      formData.bookingAgentName ||
      getName(formData.bookingAgent) ||
      getName(formData.bookingAgentId) ||
      formData.bookingAgentId,
    船公司:
      formData.carrierName ||
      formData.carrierCode ||
      getName(formData.carrier) ||
      getName(formData.carrierId) ||
      formData.carrierId,
    场站:
      formData.yardName ||
      getName(formData.yard) ||
      getName(formData.yardId) ||
      formData.yardId,
    船代:
      formData.shippingAgentName ||
      getName(formData.shippingAgent) ||
      getName(formData.shippingAgentId) ||
      formData.shippingAgentId,

    // 港口类（优先使用备注字段）
    装货港:
      formData.polRemark ||
      formData.polName ||
      getName(formData.pol) ||
      getName(formData.polId) ||
      formData.polId,
    目的港:
      formData.podRemark ||
      formData.podName ||
      getName(formData.pod) ||
      getName(formData.podId) ||
      formData.podId,
    交货地:
      formData.deliverPortRemark ||
      formData.deliverPortName ||
      getName(formData.deliverPort) ||
      getName(formData.deliverPortId) ||
      formData.deliverPortId,

    // 日期类
    货好时间: formatDate(getValue('cargoReadyDate', 'goodsReadyDate')),
    开船日期: formatDate(formData.etd),
    实际开船日期: formatDate(formData.atd),
    预抵日期: formatDate(formData.eta),
    截单日期: formatDate(getValue('siCutOffTime', 'siCutOff', 'cutOffSi')),
    截VGM日期: formatDate(getValue('vgmCutOffTime', 'vgmCutOff', 'cutOffVgm')),

    // 货物信息类
    箱型箱量:
      formData.containerInfo ||
      `${formData.ctnQty || ''}${formData.codePackageName || getName(formData.codePackage) || getName(formData.codePackageId)}`,
    件数: formData.pkgs,
    包装: getName(formData.codePackage) || getName(formData.codePackageId),
    重量: formData.kgs,
    尺码: formData.cbm,

    // 收发货人类
    发货人:
      formData.shipperName ||
      getName(formData.shipper) ||
      getName(formData.shipperId) ||
      formData.shipperId,
    收货人:
      formData.consigneeName ||
      getName(formData.consignee) ||
      getName(formData.consigneeId) ||
      formData.consigneeId,
    通知人:
      formData.notifierName ||
      getName(formData.notifier) ||
      getName(formData.notifierId) ||
      formData.notifierId,

    // 货物描述类
    唛头: formData.marks,
    货描: formData.goodsDes,

    // 运输条款类
    付费方式: getValue('paymentTerm', 'freightTerm', 'freightChargeType'),
    运输条款: getValue('transportTerm', 'moveType', 'termOfPayment'),
    签单方式: getValue('signBillType', 'billReleaseType', 'surrenderType'),

    // 备注类
    内部备注: formData.internalRemark,
    外部备注: formData.remark,
  };

  // 替换占位符，支持 [字段名] 格式
  content = content.replace(/\[(.*?)\]/g, (match, key) => {
    const value = placeholderMap[key];
    // 如果值为空，保留原始占位符，方便用户识别哪些字段缺失
    return value !== undefined && value !== null && value !== ''
      ? String(value)
      : match;
  });
  console.log('生成的内容：', formData);
  generatedContent.value = content;
};

// 复制内容
const handleCopy = async () => {
  if (!generatedContent.value) {
    message.warning('没有可复制的内容');
    return;
  }

  try {
    await navigator.clipboard.writeText(generatedContent.value);
    message.success('复制成功');
    modalOpen.value = false; // 复制成功后关闭弹窗
  } catch (error) {
    console.error('复制失败:', error);
    message.error('复制失败');
  }
};

// 打开配置弹窗
const handleSettings = () => {
  configModalOpen.value = true;
};

// 配置弹窗关闭后的回调
const handleConfigModalClose = () => {
  // 重新加载列表
  loadQuickTextList();
};

// 取消
const handleCancel = () => {
  modalOpen.value = false;
};
</script>

<template>
  <Modal
    v-model:open="modalOpen"
    title="简报"
    width="600px"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="briefing-modal">
      <!-- 模板选择区域 -->
      <div class="briefing-header">
        <div class="briefing-template-selector">
          <Select
            v-model:value="selectedTemplateId"
            placeholder="选择模板"
            style="flex: 1; margin: 0 8px"
            :loading="loading"
            :options="
              quickTextList.map((item) => ({
                label:
                  item.title || item.text?.substring(0, 20) + '...' || '未命名',
                value: item.id,
              }))
            "
          />

          <Tooltip title="配置模板">
            <Button
              type="text"
              size="small"
              class="briefing-action-btn"
              @click="handleSettings"
            >
              <IconifyIcon icon="mdi:cog-outline" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <!-- 文本编辑框 -->
      <div class="briefing-content">
        <Input.TextArea
          v-model:value="generatedContent"
          placeholder="选择模板后自动生成内容..."
          :rows="12"
          :maxlength="4096"
          show-count
        />
      </div>

      <!-- 底部按钮 -->
      <div class="briefing-footer">
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" @click="handleCopy">复制</Button>
      </div>
    </div>

    <!-- 快捷文本配置弹窗 -->
    <QuickTextConfigModal
      v-model:open="configModalOpen"
      :biz-type="bizType"
      @update:open="
        (val) => {
          if (!val) loadQuickTextList();
        }
      "
    />
  </Modal>
</template>

<style scoped>
.briefing-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.briefing-header {
  display: flex;
  align-items: center;
}

.briefing-template-selector {
  display: flex;
  align-items: center;
  width: 100%;
}

.briefing-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.briefing-content {
  flex: 1;
}

.briefing-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
