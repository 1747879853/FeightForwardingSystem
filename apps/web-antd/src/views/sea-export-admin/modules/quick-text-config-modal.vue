<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import {
  Button,
  Checkbox,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import {
  addQuickText,
  deleteQuickText,
  editQuickText,
  getQuickTextPagedList,
  type QuickTextAdminApi,
} from '#/api/quick-text/quick-text-admin';
import { QuickTextBizType } from '#/api/quick-text/quick-text-admin';

defineOptions({
  name: 'QuickTextConfigModal',
});

const props = defineProps<{
  open: boolean;
  bizType?: QuickTextBizType;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

const modalOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

// 加载状态
const loading = ref(false);
const submitLoading = ref(false);

// 模板列表数据
const templateList = ref<QuickTextAdminApi.QuickTextDto[]>([]);

// 新增/编辑表单数据
const formData = ref<Partial<QuickTextAdminApi.AddQuickTextInputDto>>({
  title: '',
  text: '',
  remark: '',
  sortId: 0,
  default: false,
  bizType: props.bizType ?? QuickTextBizType.SeaExport,
});

// 编辑模式标识
const isEditMode = ref(false);
const editingId = ref<string>('');

// 选中的模板ID列表（用于批量操作）
const selectedTemplateIds = ref<string[]>([]);

// 可用占位符（海运出口业务字段）
const availablePlaceholders = [
  // 编号类
  { label: '委托编号', value: '[委托编号]', example: '20240101001' },
  { label: '主提单号', value: '[主提单号]', example: 'COSU1234567890' },
  { label: '订舱编号', value: '[订舱编号]', example: 'BK20240101' },
  { label: '合同号', value: '[合同号]', example: 'CT20240101' },

  // 单位类
  {
    label: '委托单位',
    value: '[委托单位]',
    example: '上海某某国际贸易有限公司',
  },
  {
    label: '订舱代理',
    value: '[订舱代理]',
    example: '上海某某货运代理有限公司',
  },
  { label: '船公司', value: '[船公司]', example: 'COSCO' },
  { label: '场站', value: '[场站]', example: '外高桥堆场' },
  { label: '船代', value: '[船代]', example: '中外运船代' },

  // 港口类（使用备注字段）
  { label: '起运港', value: '[起运港]', example: 'SHANGHAI, CHINA' },
  { label: '目的港', value: '[目的港]', example: 'LOS ANGELES, USA' },
  { label: '交货地', value: '[交货地]', example: 'LOS ANGELES WAREHOUSE' },

  // 日期类
  { label: '货好日期', value: '[货好日期]', example: '2024-01-15' },
  { label: '开船日期', value: '[开船日期]', example: '2024-01-20' },
  { label: '实际开船', value: '[实际开船]', example: '2024-01-21' },
  { label: '预抵日期', value: '[预抵日期]', example: '2024-02-10' },
  { label: '截单日期', value: '[截单日期]', example: '2024-01-18' },
  { label: '截港日期', value: '[截港日期]', example: '2024-01-17' },

  // 货物信息类
  { label: '箱型箱量', value: '[箱型箱量]', example: '40NOR*1' },
  { label: '件数', value: '[件数]', example: '100' },
  { label: '包装', value: '[包装]', example: 'CARTONS' },
  { label: '重量', value: '[重量]', example: '15000.00' },
  { label: '尺码', value: '[尺码]', example: '65.500' },

  // 收发货人类
  {
    label: '发货人',
    value: '[发货人]',
    example: 'SHANGHAI EXPORTER CO., LTD.',
  },
  { label: '收货人', value: '[收货人]', example: 'LOS ANGELES IMPORTER INC.' },
  { label: '通知人', value: '[通知人]', example: 'SAME AS CONSIGNEE' },

  // 货物描述类
  { label: '唛头', value: '[唛头]', example: 'N/M' },
  { label: '货物描述', value: '[货物描述]', example: 'ELECTRONIC PARTS' },

  // 运输条款类
  { label: '付费方式', value: '[付费方式]', example: 'FREIGHT PREPAID' },
  { label: '运输条款', value: '[运输条款]', example: 'CY-CY' },
  { label: '签单方式', value: '[签单方式]', example: 'TELEX RELEASE' },

  // 备注类
  { label: '内部备注', value: '[内部备注]', example: '客户VIP，优先处理' },
  {
    label: '外部备注',
    value: '[外部备注]',
    example: 'PLEASE HANDLE WITH CARE',
  },
];

// TextArea元素引用
const textAreaRef = ref<any>(null);

/** 插入占位符到模板内容（在光标位置） */
function insertPlaceholder(placeholder: string, example: string) {
  const textArea = textAreaRef.value?.$el?.querySelector('textarea');
  if (!textArea) {
    // 如果无法获取textarea元素，回退到原来的行为
    if (!formData.value.text) {
      formData.value.text = '';
    }
    formData.value.text += placeholder;
    return;
  }

  const startPos = textArea.selectionStart;
  const endPos = textArea.selectionEnd;
  const currentText = formData.value.text || '';

  // 在光标位置插入占位符
  const newText =
    currentText.substring(0, startPos) +
    placeholder +
    currentText.substring(endPos);

  formData.value.text = newText;

  // 设置光标位置到插入内容的后面
  setTimeout(() => {
    const newCursorPos = startPos + placeholder.length;
    textArea.setSelectionRange(newCursorPos, newCursorPos);
    textArea.focus();
  }, 0);
}

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

/** 加载模板列表 */
async function loadTemplateList() {
  loading.value = true;
  try {
    const params: QuickTextAdminApi.GetPagedListParams = {
      pageIndex: 1,
      pageSize: 1000,
      bizType: props.bizType,
    };

    const result = await getQuickTextPagedList(params);
    templateList.value = result.items || [];
  } catch (error) {
    console.error('加载模板列表失败:', error);
    message.error('加载模板列表失败');
  } finally {
    loading.value = false;
  }
}

/** 重置表单 */
function handleResetForm() {
  isEditMode.value = false;
  editingId.value = '';
  formData.value = {
    title: '',
    text: '',
    remark: '',
    sortId: 0,
    default: false,
    bizType: props.bizType ?? QuickTextBizType.SeaExport,
  };
}

/** 编辑模板 */
function handleEdit(record: QuickTextAdminApi.QuickTextDto) {
  isEditMode.value = true;
  editingId.value = record.id;
  formData.value = {
    title: record.title,
    text: record.text,
    remark: record.remark,
    sortId: record.sortId,
    default: record.default,
    bizType: record.bizType,
  };
}

/** 删除模板 */
function handleDelete(record: QuickTextAdminApi.QuickTextDto) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除模板"${record.title || '未命名'}"吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteQuickText({ id: record.id });
        message.success('删除成功');
        loadTemplateList();
        // 清空选中项
        selectedTemplateIds.value = [];
        // 如果删除的是当前编辑的模板，重置表单
        if (editingId.value === record.id) {
          handleResetForm();
        }
      } catch (error) {
        console.error('删除模板失败:', error);
        message.error('删除失败');
      }
    },
  });
}

/** 设置默认模板 */
function handleSetDefault(record: QuickTextAdminApi.QuickTextDto) {
  Modal.confirm({
    title: '确认设置为默认',
    content: `确定要将"${record.title || '未命名'}"设置为默认模板吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 走编辑接口，将 default 设为 true
        await editQuickText({
          id: record.id,
          title: record.title,
          text: record.text,
          remark: record.remark,
          sortId: record.sortId,
          default: true,
        });

        message.success('设置默认模板成功');
        loadTemplateList();
      } catch (error) {
        console.error('设置默认模板失败:', error);
        message.error('设置失败');
      }
    },
  });
}

/** 保存模板 */
async function handleSave() {
  if (!formData.value.text) {
    message.warning('请输入模板内容');
    return;
  }

  submitLoading.value = true;
  try {
    if (isEditMode.value) {
      // 编辑模式
      await editQuickText({
        id: editingId.value,
        title: formData.value.title,
        text: formData.value.text!,
        remark: formData.value.remark,
        sortId: formData.value.sortId ?? 0,
        default: formData.value.default ?? false,
      });
      message.success('修改成功');
    } else {
      // 新增模式
      await addQuickText({
        bizType: formData.value.bizType ?? QuickTextBizType.SeaExport,
        title: formData.value.title,
        text: formData.value.text!,
        remark: formData.value.remark,
        sortId: formData.value.sortId ?? 0,
        default: formData.value.default ?? false,
      });
      message.success('新增成功');
    }

    // 清空表单
    handleResetForm();
    // 重新加载列表
    loadTemplateList();
  } catch (error) {
    console.error('保存模板失败:', error);
    message.error('保存失败');
  } finally {
    submitLoading.value = false;
  }
}

/** 批量删除 */
function handleBatchDelete() {
  if (selectedTemplateIds.value.length === 0) {
    message.warning('请先选择要删除的模板');
    return;
  }

  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除选中的 ${selectedTemplateIds.value.length} 个模板吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteQuickText({ ids: [...selectedTemplateIds.value] });
        message.success(`成功删除 ${selectedTemplateIds.value.length} 个模板`);
        selectedTemplateIds.value = [];
        loadTemplateList();
        // 如果删除的包含当前编辑的模板，重置表单
        if (selectedTemplateIds.value.includes(editingId.value)) {
          handleResetForm();
        }
      } catch (error) {
        console.error('批量删除失败:', error);
        message.error('批量删除失败');
      }
    },
  });
}

/** 切换模板选中状态 */
function toggleTemplateSelection(templateId: string, checked: boolean) {
  if (checked) {
    if (!selectedTemplateIds.value.includes(templateId)) {
      selectedTemplateIds.value.push(templateId);
    }
  } else {
    const index = selectedTemplateIds.value.indexOf(templateId);
    if (index > -1) {
      selectedTemplateIds.value.splice(index, 1);
    }
  }
}

/** 全选/取消全选 */
function handleSelectAll(checked: boolean) {
  if (checked) {
    selectedTemplateIds.value = templateList.value.map((t) => t.id);
  } else {
    selectedTemplateIds.value = [];
  }
}

/** 监听模态框打开 */
watch(
  () => props.open,
  async (newVal) => {
    if (newVal) {
      // 加载模板列表
      await loadTemplateList();
      // 重置表单
      handleResetForm();
      // 清空选中项
      selectedTemplateIds.value = [];
    }
  },
);

onMounted(() => {
  // 初始化时不自动加载，等待模态框打开
});
</script>

<template>
  <Modal
    v-model:open="modalOpen"
    title="快捷文本配置"
    width="1200px"
    :footer="null"
    :body-style="{ padding: '16px' }"
  >
    <div style="display: flex; gap: 16px">
      <!-- 左侧：模板列表 -->
      <div style="flex: 1; min-width: 0">
        <!-- 可用占位符 -->
        <div
          style="
            padding: 12px;
            margin-bottom: 16px;
            background: #fff7f0;
            border: 2px solid #ff4d4f;
            border-radius: 4px;
          "
        >
          <div style="margin-bottom: 8px; font-weight: bold; color: #ff4d4f">
            可用占位符：
          </div>
          <Space wrap size="small">
            <Button
              v-for="ph in availablePlaceholders"
              :key="ph.value"
              size="small"
              type="primary"
              ghost
              @click="insertPlaceholder(ph.value, ph.example)"
            >
              {{ ph.label }}
            </Button>
          </Space>
        </div>

        <!-- 模板列表头部 -->
        <div
          style="
            padding: 12px;
            margin-bottom: 16px;
            background: #fafafa;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
          "
        >
          <div style="display: flex; gap: 12px; align-items: center">
            <span style="font-size: 14px; font-weight: bold"
              >已有模板 ({{ templateList.length }})</span
            >

            <!-- 批量操作按钮 -->
            <template v-if="selectedTemplateIds.length > 0">
              <span style="font-weight: bold; color: #1890ff"
                >已选中 {{ selectedTemplateIds.length }} 项</span
              >
              <Button size="small" danger @click="handleBatchDelete">
                批量删除
              </Button>
            </template>
          </div>
        </div>

        <!-- 模板列表 -->
        <div style="max-height: 390px; overflow-y: auto">
          <!-- 全选复选框 -->
          <div
            v-if="templateList.length > 0"
            style="
              padding: 8px 12px;
              margin-bottom: 12px;
              background: #fff;
              border: 1px solid #d9d9d9;
              border-radius: 4px;
            "
          >
            <Checkbox
              :checked="
                selectedTemplateIds.length === templateList.length &&
                templateList.length > 0
              "
              :indeterminate="
                selectedTemplateIds.length > 0 &&
                selectedTemplateIds.length < templateList.length
              "
              @change="(e) => handleSelectAll(e.target.checked)"
            >
              全选
            </Checkbox>
          </div>

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
              <div
                style="display: flex; flex: 1; gap: 8px; align-items: center"
              >
                <Checkbox
                  :checked="selectedTemplateIds.includes(item.id)"
                  @change="
                    (e) => toggleTemplateSelection(item.id, e.target.checked)
                  "
                />
                <div
                  style="
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    min-width: 0;
                  "
                >
                  <span
                    style="
                      overflow: hidden;
                      text-overflow: ellipsis;
                      font-size: 16px;
                      font-weight: bold;
                      white-space: nowrap;
                    "
                  >
                    {{ item.title || '未命名' }}
                  </span>
                  <Button
                    v-if="!item.default"
                    size="small"
                    type="primary"
                    ghost
                    style="height: 24px; padding: 0 8px"
                    @click="handleSetDefault(item)"
                  >
                    设默认
                  </Button>
                  <Tag v-if="item.default" color="orange">默认</Tag>
                </div>
                <Tag v-if="item.remark" color="blue" style="flex-shrink: 0">
                  {{ item.remark.substring(0, 10)
                  }}{{ item.remark.length > 10 ? '...' : '' }}
                </Tag>
              </div>
              <Space size="small" style="flex-shrink: 0">
                <Button size="small" @click="handleEdit(item)">编辑</Button>
                <Button size="small" danger @click="handleDelete(item)"
                  >删除</Button
                >
              </Space>
            </div>
            <div
              style="
                padding: 8px;
                font-size: 13px;
                line-height: 1.6;
                word-break: break-all;
                white-space: pre-wrap;
                background: #fff;
                border: 1px solid #e8e8e8;
                border-radius: 4px;
              "
            >
              {{ item.text || '(空模板)' }}
            </div>
          </div>

          <div
            v-if="templateList.length === 0 && !loading"
            style="padding: 40px; color: #999; text-align: center"
          >
            暂无模板数据
          </div>
        </div>
      </div>

      <!-- 右侧：新增/编辑表单 -->
      <div style="flex-shrink: 0; width: 400px">
        <div
          style="
            padding: 16px;
            background: #f0f5ff;
            border: 1px solid #adc6ff;
            border-radius: 4px;
          "
        >
          <div style="margin-bottom: 16px; font-size: 16px; font-weight: bold">
            {{ isEditMode ? '✏️ 编辑模板' : '➕ 新增模板' }}
          </div>

          <div style="margin-bottom: 12px">
            <label style="display: block; margin-bottom: 4px; font-weight: bold"
              >模板标题</label
            >
            <Input
              v-model:value="formData.title"
              placeholder="如: 订舱通知"
              :maxlength="32"
              show-count
            />
          </div>

          <div style="margin-bottom: 12px">
            <label style="display: block; margin-bottom: 4px; font-weight: bold"
              >模板内容</label
            >
            <Input.TextArea
              ref="textAreaRef"
              v-model:value="formData.text"
              :rows="8"
              placeholder="输入模板内容，可点击左侧占位符插入..."
              :maxlength="4096"
              show-count
            />
          </div>

          <!-- <div style="margin-bottom: 12px">
            <label style="display: block; margin-bottom: 4px; font-weight: bold"
              >备注</label
            >
            <Input.TextArea
              v-model:value="formData.remark"
              :rows="3"
              placeholder="可选，如: 发给客户用"
              :maxlength="4096"
              show-count
            />
          </div> -->

          <!-- <div style="margin-bottom: 12px">
            <label style="display: block; margin-bottom: 4px; font-weight: bold"
              >排序值</label
            >
            <Input
              v-model:value="formData.sortId"
              type="number"
              placeholder="数字越大越靠前"
            />
          </div> -->

          <!-- <div style="margin-bottom: 12px">
            <Checkbox v-model:checked="formData.default">
              设为默认模板
            </Checkbox>
          </div> -->

          <!-- 模板预览标题 -->
          <div
            style="
              margin-bottom: 8px;
              font-size: 13px;
              font-weight: bold;
              color: #666;
            "
          >
            模板预览（示例效果）
          </div>

          <!-- 模板预览内容 -->
          <div
            style="
              height: 160px;
              padding: 12px;
              margin-bottom: 12px;
              overflow-y: auto;
              background: #fff;
              border: 1px dashed #d9d9d9;
              border-radius: 4px;
            "
          >
            <div
              style="
                font-size: 12px;
                line-height: 1.6;
                color: #333;
                word-break: break-all;
                white-space: pre-wrap;
              "
            >
              {{ generateExampleText(formData.text) }}
            </div>
          </div>

          <Space style="width: 100%" direction="vertical">
            <Button
              type="primary"
              block
              :loading="submitLoading"
              @click="handleSave"
            >
              {{ isEditMode ? '保存修改' : '+ 保存模板' }}
            </Button>
            <Button block @click="handleResetForm">重置</Button>
          </Space>
        </div>
      </div>
    </div>
  </Modal>
</template>
