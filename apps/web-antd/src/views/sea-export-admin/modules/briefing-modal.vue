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
// 添加海运出口详情接口
import { getSeaExportDetail } from '#/api/sea-export/sea-export-admin';

defineOptions({
  name: 'BriefingModal',
});

const props = defineProps<{
  open: boolean;
  bizType?: QuickTextBizType;
  // 移除 formData prop，添加 seaExportId prop
  seaExportId?: string | number;
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

// 海运出口详情数据
const seaExportDetail = ref<any>(null);

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

// 加载海运出口详情
const loadSeaExportDetail = async () => {
  if (!props.seaExportId) {
    seaExportDetail.value = null;
    return;
  }

  try {
    const detail = await getSeaExportDetail(props.seaExportId);
    seaExportDetail.value = detail;
  } catch (error) {
    console.error('加载海运出口详情失败:', error);
    message.error('加载海运出口详情失败');
    seaExportDetail.value = null;
  }
};

// 监听弹窗打开，加载数据
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      loadQuickTextList();
      loadSeaExportDetail();
    }
  },
);

// 监听选中模板变化，生成内容
watch(selectedTemplateId, () => {
  generateContent();
});

// 监听详情数据变化，重新生成内容
watch(
  () => seaExportDetail.value,
  () => {
    if (props.open) {
      generateContent();
    }
  },
  { deep: true },
);

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
  console.log('seaExportDetail', seaExportDetail);
  const transportOrder = seaExportDetail.value?.transportOrder || {};
  const seaExport = seaExportDetail.value || {};

  for (const key of keys) {
    // 优先从 transportOrder 中获取
    if (
      transportOrder[key] !== undefined &&
      transportOrder[key] !== null &&
      transportOrder[key] !== ''
    ) {
      return transportOrder[key];
    }
    // 然后从 seaExport 中获取
    if (
      seaExport[key] !== undefined &&
      seaExport[key] !== null &&
      seaExport[key] !== ''
    ) {
      return seaExport[key];
    }
  }
  return '';
};

// 辅助函数：从对象中获取名称
const getName = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // 尝试常见的名称字段
    return (
      value.cnName ||
      value.name ||
      value.portName ||
      value.clientName ||
      value.carrierName ||
      value.cnShortName ||
      value.enName ||
      value.billType ||
      ''
    );
  }
  return '';
};

// 辅助函数：从对象中获取名称
const getRemarkName = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // 尝试常见的名称字段
    return (
      value.cnName ||
      value.name ||
      value.portName ||
      value.clientName ||
      value.carrierName ||
      value.cnShortName ||
      value.enName ||
      ''
    );
  }
  return '';
};

// 辅助函数：从对象中获取名称
const getFullName = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'object') {
    // 尝试常见的名称字段
    return value.fullName || '';
  }
  return '';
};
// 辅助函数：从对象中获取名称
const getCodeName = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'object') {
    // 尝试常见的名称字段
    return value.code || '';
  }
  return '';
};

// 生成内容（替换占位符）
const generateContent = () => {
  const template = selectedTemplate.value;
  if (!template || !template.text) {
    generatedContent.value = '';
    return;
  }

  let content = template.text;

  // 海运出口占位符映射关系（只用于方括号格式的占位符）
  const placeholderMap: Record<string, any> = {
    // 编号类
    委托编号: getValue('commissionNum'),
    主提单号: getValue('mblNum'),
    订舱编号: getValue('bookingNum'),
    合同号: getValue('contractNum'),

    // 单位类
    委托单位: getFullName(getValue('client')),
    订舱代理: getFullName(getValue('bookingAgent')),
    船公司: getCodeName(getValue('carrier')),
    船代: getName(getValue('shipAgent')) || getValue('shipAgentId'),
    场站: getName(getValue('yard')) || getValue('yardId'),
    报关行: getName(getValue('custBroker')) || getValue('custBrokerId'),
    保险公司: getName(getValue('insurance')) || getValue('insuranceId'),
    车队: getName(getValue('team')) || getValue('teamId'),
    仓库: getName(getValue('warehouse')) || getValue('warehouseId'),

    // 港口类
    起运港: getRemarkName(getValue('polRemark')),
    目的港: getRemarkName(getValue('podRemark')),
    中转港1: getRemarkName(getValue('pot1')),
    中转港2: getRemarkName(getValue('pot2')),
    交货地: getRemarkName(getValue('deliverPortRemark')),
    收货地: getRemarkName(getValue('receivePort')),

    // 船期类
    船名: getValue('vessel'),
    航次: getValue('innerVoyno'),
    开船日期: formatDate(getValue('etd')),
    实际开船: formatDate(getValue('atd')),
    预抵日期: formatDate(getValue('eta')),
    货好日期: formatDate(getValue('goodsCompleteTime')),
    截港日期: formatDate(getValue('closeVgmTime')),
    截单日期: formatDate(getValue('closeDocTime')),
    截VGM日期: formatDate(getValue('closeVgmTime')),
    截关日期: formatDate(getValue('closeManifestTime')),
    签单日期: formatDate(getValue('signingTime')),

    // 货物信息类
    发货人: getValue('shipperContent'),
    收货人: getValue('consigneeContent'),
    通知人: getValue('notifierContent'),
    唛头: getValue('marks'),
    货物描述: getValue('goodsDes'),
    件数: getValue('pkgs'),
    重量: getValue('kgs'),
    尺码: getValue('cbm'),
    包装: getName(getValue('codePackage')) || getValue('codePackageId'),
    箱型箱量: getName(getValue('totalCtn')),

    // 其他信息类
    外部备注: getValue('remark'),
    内部备注: getValue('internalRemark'),

    付费方式: getName(getValue('codeFrt')),
    运输条款: getName(getValue('codeService')),
    签单方式: getName(getValue('codeIssueType')),
  };

  // 替换占位符，只支持 [字段名] 格式
  content = content.replace(/\[(.*?)\]/g, (match, key) => {
    const value = placeholderMap[key];
    // 如果值为空，保留原始占位符，方便用户识别哪些字段缺失
    return value !== undefined && value !== null && value !== ''
      ? String(value)
      : match;
  });

  console.log('生成的内容：', seaExportDetail.value);
  generatedContent.value = content;
};

// 复制内容
const handleCopy = async () => {
  if (!generatedContent.value) {
    message.warning('没有可复制的内容');
    return;
  }

  try {
    // 首先尝试使用现代的 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(generatedContent.value);
      message.success('复制成功');
      modalOpen.value = false; // 复制成功后关闭弹窗
      return;
    }

    // 如果 Clipboard API 不可用，使用传统的 execCommand 方法
    const textArea = document.createElement('textarea');
    textArea.value = generatedContent.value;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (success) {
      message.success('复制成功');
      modalOpen.value = false; // 复制成功后关闭弹窗
    } else {
      throw new Error('execCommand copy failed');
    }
  } catch (error) {
    console.error('复制失败:', error);
    message.error('复制失败，请手动复制内容');
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
