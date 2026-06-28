<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  Modal,
  Button,
  Input,
  Select,
  message,
  Space,
  Tag,
  Checkbox,
} from 'ant-design-vue';
import { InvoiceRemarkTemplateApi } from '#/api/Invoice/invoiceRemarkTemplate';
import { CurrencySelect } from '#/adapter/component';
import { useUserStore } from '@vben/stores';

interface Props {
  visible: boolean;
  // 用于接收当前表单的结算单位和币别信息，以便自动加载默认模板
  settlementId?: string;
  currencyId?: number;
  currencyCode?: string;
  // 用于接收费用明细数据，以便提取备注
  feeDetails?: any[];
  // 是否处于编辑模式
  isEdit?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  settlementId: '',
  currencyId: undefined,
  currencyCode: '',
  feeDetails: () => [],
  isEdit: false,
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
const submitLoading = ref(false);

// 筛选条件
const filterCompanyId = ref<number | undefined>();
const filterCurrencyId = ref<number | undefined>();

const exampleTemplate = ref<string>('');

// 模板列表数据
const templateList = ref<InvoiceRemarkTemplateApi.InvoiceRemarkTemListDto[]>(
  [],
);

// 新增/编辑表单数据
const formData = ref<Partial<InvoiceRemarkTemplateApi.InvoiceRemarkTemAddDto>>({
  name: '',
  companyId: undefined,
  currencyId: undefined,
  template: '',
  default: false,
});

// 编辑模式标识
const isEditMode = ref(false);
const editingId = ref<string>('');

// 公司列表 - 从用户信息中获取
const companyList = ref<InvoiceRemarkTemplateApi.CompanySimpleDto[]>([]);

// 选中的模板ID列表（用于批量操作）
const selectedTemplateIds = ref<string[]>([]);

// 可用占位符
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

// 用户store
const userStore = useUserStore();

const updateSelectedCurrencyId = (value: number | undefined) => {
  formData.value.currencyId = value;
};

/** 插入占位符到模板内容 */
function insertPlaceholder(placeholder: string, example: string) {
  if (!formData.value.template) {
    formData.value.template = '';
    exampleTemplate.value = '';
  }
  formData.value.template += placeholder;
  exampleTemplate.value += example;
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

/** 从用户信息中提取公司列表 */
function extractCompanyFromUserInfo() {
  const userInfo = userStore.userInfo as any;

  // 尝试从用户信息中获取公司列表
  if (userInfo?.companies && Array.isArray(userInfo.companies)) {
    companyList.value = userInfo.companies.map((company: any) => ({
      id: company.id,
      code: company.code || '',
      displayName: company.displayName || company.name || '',
      shortName: company.shortName || '',
      enName: company.enName || '',
      isCompany: true,
      localCurrencyId: company.localCurrencyId || 1,
      unifiedSocialCreditCode: company.unifiedSocialCreditCode || '',
    }));
  } else if (userInfo?.company) {
    // 如果只有一个公司
    companyList.value = [
      {
        id: userInfo.company.id,
        code: userInfo.company.code || '',
        displayName:
          userInfo.company.displayName || userInfo.company.name || '',
        shortName: userInfo.company.shortName || '',
        enName: userInfo.company.enName || '',
        isCompany: true,
        localCurrencyId: userInfo.company.localCurrencyId || 1,
        unifiedSocialCreditCode: userInfo.company.unifiedSocialCreditCode || '',
      },
    ];
  }

  console.log('提取的公司列表:', companyList.value);
}

/** 加载模板列表 */
async function loadTemplateList() {
  loading.value = true;
  try {
    const params: any = {
      pageIndex: 1,
      pageSize: 1000,
    };

    if (filterCompanyId.value) {
      params.companyId = filterCompanyId.value;
    }
    if (filterCurrencyId.value) {
      params.currencyId = filterCurrencyId.value;
    }

    const result = await InvoiceRemarkTemplateApi.getPagedListAsync(params);
    templateList.value = result.items || [];

    // 如果有传入结算单位和币别，尝试自动加载默认模板
    if (props.settlementId && props.currencyId && !props.isEdit) {
      autoLoadDefaultTemplate(props.settlementId, props.currencyId);
    }
  } catch (error) {
    console.error('加载模板列表失败:', error);
    message.error('加载模板列表失败');
  } finally {
    loading.value = false;
  }
}

/** 自动加载默认模板 */
function autoLoadDefaultTemplate(settlementId: string, currencyId: number) {
  // 查找匹配结算单位（companyId）和币别的默认模板
  const defaultTemplate = templateList.value.find(
    (t) =>
      t.companyId === Number(settlementId) &&
      t.currencyId === currencyId &&
      t.default,
  );

  if (defaultTemplate) {
    // 自动填充表单
    formData.value = {
      name: defaultTemplate.name,
      companyId: defaultTemplate.companyId,
      currencyId: defaultTemplate.currencyId,
      template: defaultTemplate.template,
      default: defaultTemplate.default,
    };

    message.info(
      `已自动加载默认模板：${defaultTemplate.company.displayName}-${defaultTemplate.currency.cnName}`,
    );
  } else {
    // 如果没有找到默认模板，只填充公司和币别
    formData.value.companyId = Number(settlementId);
    formData.value.currencyId = currencyId;
  }
}

/** 重置筛选条件 */
function handleResetFilter() {
  filterCompanyId.value = undefined;
  filterCurrencyId.value = undefined;
  loadTemplateList();
}

/** 新增模板 */
function handleAdd() {
  isEditMode.value = false;
  editingId.value = '';
  formData.value = {
    name: '',
    companyId: undefined,
    currencyId: undefined,
    template: '',
    default: false,
  };
}

/** 编辑模板 */
function handleEdit(record: InvoiceRemarkTemplateApi.InvoiceRemarkTemListDto) {
  isEditMode.value = true;
  editingId.value = record.id;
  formData.value = {
    name: record.name,
    companyId: record.companyId,
    currencyId: record.currencyId,
    template: record.template,
    default: record.default,
  };
}

/** 使用模板 */
function handleUse(record: InvoiceRemarkTemplateApi.InvoiceRemarkTemListDto) {
  // 发送事件给父组件，让父组件将模板内容填入备注字段
  emit('use-template', record.template);
  message.success('模板已应用到备注字段');
  // 关闭弹窗
  modalVisible.value = false;
}

/** 删除模板 */
function handleDelete(
  record: InvoiceRemarkTemplateApi.InvoiceRemarkTemListDto,
) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除模板"${record.company.displayName}-${record.currency.cnName}"吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await InvoiceRemarkTemplateApi.deleteAsync({ id: record.id });
        message.success('删除成功');
        loadTemplateList();
        // 清空选中项
        selectedTemplateIds.value = [];
      } catch (error) {
        console.error('删除模板失败:', error);
        message.error('删除失败');
      }
    },
  });
}

/** 设置默认模板 */
function handleSetDefault(
  record: InvoiceRemarkTemplateApi.InvoiceRemarkTemListDto,
) {
  Modal.confirm({
    title: '确认设置为默认',
    content: `确定要将"${record.company.displayName}-${record.currency.cnName}"设置为默认模板吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 先查询该组合是否已有默认模板
        const existingTemplates = templateList.value.filter(
          (t) =>
            t.companyId === record.companyId &&
            t.currencyId === record.currencyId &&
            t.default,
        );

        // 如果已有默认模板且不是当前模板，需要先取消它的默认状态
        if (
          existingTemplates.length > 0 &&
          existingTemplates[0]?.id !== record.id
        ) {
          const firstTemplate = existingTemplates[0];
          if (firstTemplate) {
            await InvoiceRemarkTemplateApi.editAsync({
              id: firstTemplate.id,
              name: firstTemplate.name,
              companyId: firstTemplate.companyId,
              currencyId: firstTemplate.currencyId,
              template: firstTemplate.template,
              default: false,
            });
          }
        }

        // 设置当前模板为默认
        await InvoiceRemarkTemplateApi.editAsync({
          id: record.id,
          name: record.name,
          companyId: record.companyId,
          currencyId: record.currencyId,
          template: record.template,
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
  // 验证必填字段
  if (!formData.value.companyId) {
    message.warning('请选择所属公司');
    return;
  }
  if (!formData.value.currencyId) {
    message.warning('请选择币别');
    return;
  }

  submitLoading.value = true;
  try {
    if (isEditMode.value) {
      // 编辑模式
      await InvoiceRemarkTemplateApi.editAsync({
        id: editingId.value,
        name: formData.value.name!,
        companyId: formData.value.companyId!,
        currencyId: formData.value.currencyId!,
        template: formData.value.template,
        default: formData.value.default || false,
      });
      message.success('修改成功');
    } else {
      // 新增模式 - 检查是否已存在相同组合的模板
      // const existingTemplate = templateList.value.find(
      //   (t) =>
      //     t.companyId === formData.value.companyId &&
      //     t.currencyId === formData.value.currencyId,
      // );

      // if (existingTemplate) {
      //   message.warning(
      //     `${existingTemplate.company.displayName}-${existingTemplate.currency.cnName} 的模板已存在，请先删除或编辑现有模板`,
      //   );
      //   return;
      // }

      await InvoiceRemarkTemplateApi.addAsync({
        name: formData.value.name!,
        companyId: formData.value.companyId!,
        currencyId: formData.value.currencyId!,
        template: formData.value.template,
        default: formData.value.default || false,
      });
      message.success('新增成功');
    }

    // 清空表单
    handleAdd();
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
        // 逐个删除
        for (const id of selectedTemplateIds.value) {
          await InvoiceRemarkTemplateApi.deleteAsync({ id });
        }
        message.success(`成功删除 ${selectedTemplateIds.value.length} 个模板`);
        selectedTemplateIds.value = [];
        loadTemplateList();
      } catch (error) {
        console.error('批量删除失败:', error);
        message.error('批量删除失败');
      }
    },
  });
}

/** 批量设置默认 */
function handleBatchSetDefault() {
  if (selectedTemplateIds.value.length === 0) {
    message.warning('请先选择要设置默认的模板');
    return;
  }

  Modal.confirm({
    title: '确认批量设置默认',
    content: `确定要将选中的 ${selectedTemplateIds.value.length} 个模板都设置为默认吗？注意：每个公司+币别组合只能有一个默认模板。`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        let successCount = 0;

        for (const id of selectedTemplateIds.value) {
          const template = templateList.value.find((t) => t.id === id);
          if (!template) continue;

          // 先查询该组合是否已有默认模板
          const existingTemplates = templateList.value.filter(
            (t) =>
              t.companyId === template.companyId &&
              t.currencyId === template.currencyId &&
              t.default &&
              t.id !== id,
          );

          // 如果已有默认模板且不是当前模板，需要先取消它的默认状态
          if (existingTemplates.length > 0) {
            const firstTemplate = existingTemplates[0];
            if (firstTemplate) {
              await InvoiceRemarkTemplateApi.editAsync({
                id: firstTemplate.id,
                name: firstTemplate.name,
                companyId: firstTemplate.companyId,
                currencyId: firstTemplate.currencyId,
                template: firstTemplate.template,
                default: false,
              });
            }
          }

          // 设置当前模板为默认
          await InvoiceRemarkTemplateApi.editAsync({
            id: template.id,
            name: template.name,
            companyId: template.companyId,
            currencyId: template.currencyId,
            template: template.template,
            default: true,
          });

          successCount++;
        }

        message.success(`成功设置 ${successCount} 个模板为默认`);
        selectedTemplateIds.value = [];
        loadTemplateList();
      } catch (error) {
        console.error('批量设置默认失败:', error);
        message.error('批量设置默认失败');
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
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      // 从用户信息中提取公司列表
      extractCompanyFromUserInfo();
      // 加载模板列表
      await loadTemplateList();
      // 重置表单
      handleAdd();
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
    v-model:open="modalVisible"
    title="备注模板管理"
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

        <!-- 筛选条件 -->
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
            <span style="color: #999">筛选:</span>
            <Select
              v-model:value="filterCompanyId"
              :options="
                companyList.map((c) => ({ label: c.displayName, value: c.id }))
              "
              placeholder="全部公司"
              style="width: 150px"
              allow-clear
            />
            <CurrencySelect
              v-model:value="filterCurrencyId"
              placeholder="全部币别"
              style="width: 150px"
              allow-clear
            />
            <Button type="primary" size="small" @click="loadTemplateList">
              查询
            </Button>
            <Button size="small" @click="handleResetFilter">重置</Button>

            <!-- 批量操作按钮 -->
            <template v-if="selectedTemplateIds.length > 0">
              <span style="font-weight: bold; color: #1890ff"
                >已选中 {{ selectedTemplateIds.length }} 项</span
              >
              <Button size="small" danger @click="handleBatchDelete">
                批量删除
              </Button>
              <Button
                size="small"
                type="primary"
                @click="handleBatchSetDefault"
              >
                批量设默认
              </Button>
            </template>
          </div>
        </div>

        <!-- 模板列表 -->
        <div style="max-height: 500px; overflow-y: auto">
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
              <div style="display: flex; gap: 8px; align-items: center">
                <Checkbox
                  :checked="selectedTemplateIds.includes(item.id)"
                  @change="
                    (e) => toggleTemplateSelection(item.id, e.target.checked)
                  "
                />
                <Tag v-if="item.default" color="orange">默认</Tag>
                <span style="font-size: 16px; font-weight: bold">
                  {{ item.name }}
                </span>
                <Tag :color="item.currency.code === 'RMB' ? 'green' : 'blue'">
                  {{ item.currency.code }}
                </Tag>
              </div>
              <Space size="small">
                <Button size="small" type="primary" @click="handleUse(item)"
                  >使用</Button
                >
                <Button
                  v-if="!item.default"
                  size="small"
                  type="primary"
                  ghost
                  @click="handleSetDefault(item)"
                >
                  设默认
                </Button>
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
              {{ item.template || '(空模板)' }}
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
              >模板名称</label
            >
            <Input
              :value="formData.name"
              placeholder="如: RMB通用模板"
              @update:value="(v) => (formData.name = v)"
            />
          </div>

          <div style="margin-bottom: 12px">
            <label style="display: block; margin-bottom: 4px; font-weight: bold"
              >币别</label
            >
            <CurrencySelect
              :model-value="formData.currencyId"
              placeholder="请选择币别"
              style="width: 100%"
              @update:model-value="(v) => updateSelectedCurrencyId(v as number)"
            />
          </div>

          <div style="margin-bottom: 12px">
            <label style="display: block; margin-bottom: 4px; font-weight: bold"
              >所属公司</label
            >
            <Select
              v-model:value="formData.companyId"
              :options="
                companyList.map((c) => ({ label: c.displayName, value: c.id }))
              "
              placeholder="请选择所属公司"
              style="width: 100%"
            />
          </div>

          <div style="margin-bottom: 12px">
            <label style="display: block; margin-bottom: 4px; font-weight: bold"
              >模板内容</label
            >
            <Input.TextArea
              v-model:value="formData.template"
              :rows="8"
              placeholder="输入模板内容，可点击左侧占位符插入..."
            />
          </div>

          <!-- 模板预览 -->
          <div
            v-if="formData.template"
            style="
              padding: 12px;
              margin-bottom: 12px;
              background: #fff;
              border: 1px dashed #d9d9d9;
              border-radius: 4px;
            "
          >
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
            <div
              style="
                font-size: 12px;
                line-height: 1.6;
                color: #333;
                word-break: break-all;
                white-space: pre-wrap;
              "
            >
              {{ generateExampleText(formData.template) }}
            </div>
          </div>

          <Button
            type="primary"
            block
            :loading="submitLoading"
            @click="handleSave"
            style="margin-top: 8px"
          >
            {{ isEditMode ? '保存修改' : '+ 保存模板' }}
          </Button>
        </div>
      </div>
    </div>
  </Modal>
</template>
