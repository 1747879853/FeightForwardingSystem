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
import { resolveOrganizationCompany } from '#/api/system/organization-unit';
import {
  getCompanyIdByOrgId,
  getMyTrueCompanyOptions,
} from '#/composables/use-my-org';
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
  orgId: undefined,
  currencyId: undefined,
  template: '',
  default: false,
});

// 编辑模式标识
const isEditMode = ref(false);
const editingId = ref<string>('');

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

/** 加载模板列表 */
async function loadTemplateList() {
  loading.value = true;
  try {
    const params: any = {
      pageIndex: 1,
      pageSize: 1000,
    };
    if (filterCompanyId.value) {
      params.orgId = filterCompanyId.value;
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
  // 查找匹配结算单位（orgId）和币别的默认模板
  const defaultTemplate = templateList.value.find(
    (t) =>
      String(t.orgId) === String(settlementId) &&
      t.currencyId === currencyId &&
      t.default,
  );

  if (defaultTemplate) {
    // 自动填充表单
    formData.value = {
      name: defaultTemplate.name,
      orgId: defaultTemplate.orgId,
      currencyId: defaultTemplate.currencyId,
      template: defaultTemplate.template,
      default: defaultTemplate.default,
    };

    message.info(
      `已自动加载默认模板：${defaultTemplate.orgs?.at(-1)?.name ?? ''}-${defaultTemplate.currency.cnName}`,
    );
  } else {
    // 如果没有找到默认模板，只填充公司和币别
    formData.value.orgId = settlementId;
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
    orgId: undefined,
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
    orgId: record.orgId,
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
    content: `确定要删除模板"${record.orgs?.at(-1)?.name ?? ''}-${record.currency.cnName}"吗？`,
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
    content: `确定要将"${record.name}"设置为默认模板吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 先查询该组合是否已有默认模板
        const existingTemplates = templateList.value.filter(
          (t) =>
            t.orgId === record.orgId &&
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
              orgId: firstTemplate.orgId,
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
          orgId: record.orgId,
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
  if (!formData.value.orgId) {
    message.warning('请选择归属组织');
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
        orgId: formData.value.orgId!,
        currencyId: formData.value.currencyId!,
        template: formData.value.template,
        default: formData.value.default || false,
      });
      message.success('修改成功');
    } else {
      // 新增模式 - 检查是否已存在相同组合的模板
      // const existingTemplate = templateList.value.find(
      //   (t) =>
      //     t.orgId === formData.value.orgId &&
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
        orgId: formData.value.orgId!,
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

// 归属组织列表 - 取本人直属组织
const companyList = ref<{ displayName: string; id: number }[]>([]);
/** 提取本人直属组织作为可选归属组织 */
function extractCompanyFromUserInfo() {
  companyList.value = getMyTrueCompanyOptions().map((o) => ({
    id: o.value,
    displayName: o.label,
  }));
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
              t.orgId === template.orgId &&
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
                orgId: firstTemplate.orgId,
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
            orgId: template.orgId,
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

/** 获取默认备注模板 */
async function getDefaultRemarkTemplate(
  orgId: number,
  currencyId: number,
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
  },
): Promise<string> {
  try {
    // 备注模板按公司维度维护，需先把归属组织换算成公司ID再查询，否则查不到默认模板导致备注为空
    const templateOrgId =
      getCompanyIdByOrgId(orgId) ??
      (await resolveOrganizationCompany(orgId))?.id ??
      orgId;

    const result = await InvoiceRemarkTemplateApi.getPagedListAsync({
      pageIndex: 1,
      pageSize: 1,
      orgId: templateOrgId,
      currencyId,
      default: true, // 只查询默认模板
    });

    if (result.items && result.items.length > 0) {
      const defaultTemplate = result.items[0];
      if (defaultTemplate) {
        let templateContent = defaultTemplate.template || '';

        // ✅ 如果有 templateData，进行占位符替换
        if (templateData) {
          templateContent = replacePlaceholders(templateContent, templateData);
        } else {
        }

        return templateContent;
      }
    } else {
    }
    return '';
  } catch (error) {
    console.error('获取默认备注模板失败:', error);
    return '';
  }
}

/** 根据模板数据替换占位符生成实际备注 */
function replacePlaceholders(
  template: string,
  templateData: {
    commissionNum: string;
    mblNum: string;
    invoiceExchangeRate: number;
    foreignCurrencyAmount: string;
    rmbAmount: string;
    clientBankName: string;
    clientBankAccount: string;
    orgBankName: string;
    orgBankAccount: string;
  },
): string {
  if (!template) return '';

  let result = template;

  // 委托编号 - 使用字符串替换方法，避免正则转义问题
  if (templateData.commissionNum) {
    const beforeReplace = result;
    result = result.split('<委托编号>').join(templateData.commissionNum);
  } else {
    console.warn('⚠️ 委托编号为空，跳过替换');
  }

  // 主提单号 - 使用字符串替换方法，避免正则转义问题
  if (templateData.mblNum) {
    const beforeReplace = result;
    result = result.split('<主提单号>').join(templateData.mblNum);
  } else {
    console.warn('⚠️ 主提单号为空，跳过替换');
  }

  // 发票汇率
  result = result.replace(
    /\[折算汇率\]/g,
    String(templateData.invoiceExchangeRate),
  );

  // 外币金额总计
  result = result.replace(
    /\[外币金额\(总计\)\]/g,
    templateData.foreignCurrencyAmount,
  );

  // 人民币金额总计
  result = result.replace(/\[人民币金额\(总计\)\]/g, templateData.rmbAmount);

  // 购方银行
  result = result.replace(/\[购方银行\]/g, templateData.clientBankName);

  // 购方账号
  result = result.replace(/\[购方账号\]/g, templateData.clientBankAccount);

  // 销方银行
  result = result.replace(/\[销方银行\]/g, templateData.orgBankName);

  // 销方账号
  result = result.replace(/\[销方账号\]/g, templateData.orgBankAccount);

  return result;
}

// 暴露方法给父组件
defineExpose({
  getDefaultRemarkTemplate,
});
</script>

<template>
  <Modal
    v-model:open="modalVisible"
    title="备注模板管理"
    width="1200px"
    :footer="null"
    class="remark-template-manage-modal"
    :body-style="{ padding: '0' }"
  >
    <div class="rtm">
      <!-- 左侧：列表与占位符 -->
      <div class="rtm__main">
        <section class="rtm-section rtm-section--placeholders">
          <div class="rtm-section__head">
            <span class="rtm-section__indicator" />
            <span class="rtm-section__title">可用占位符</span>
            <span class="rtm-section__hint">点击插入到右侧模板内容</span>
          </div>
          <div class="rtm-placeholder-chips">
            <button
              v-for="ph in availablePlaceholders"
              :key="ph.value"
              type="button"
              class="rtm-chip"
              :title="`插入 ${ph.value}`"
              @click="insertPlaceholder(ph.value, ph.example)"
            >
              {{ ph.label }}
            </button>
          </div>
        </section>

        <section class="rtm-section rtm-section--list">
          <div class="rtm-toolbar">
            <div class="rtm-toolbar__title">
              <span class="rtm-section__indicator" />
              <span>已有模板</span>
              <span class="rtm-count">{{ templateList.length }}</span>
            </div>
            <div class="rtm-toolbar__filters">
              <Select
                v-model:value="filterCompanyId"
                :options="
                  companyList.map((c) => ({
                    label: c.displayName,
                    value: c.id,
                  }))
                "
                placeholder="全部公司"
                class="rtm-filter-select"
                allow-clear
              />
              <CurrencySelect
                v-model="filterCurrencyId"
                placeholder="全部币别"
                class="rtm-filter-select"
                allow-clear
              />
              <Button type="primary" size="small" @click="loadTemplateList">
                查询
              </Button>
              <Button size="small" @click="handleResetFilter">重置</Button>
            </div>
          </div>

          <div v-if="selectedTemplateIds.length > 0" class="rtm-batch-bar">
            <span class="rtm-batch-bar__text">
              已选中 {{ selectedTemplateIds.length }} 项
            </span>
            <Space size="small">
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
            </Space>
          </div>

          <div class="rtm-list">
            <div v-if="templateList.length > 0" class="rtm-select-all">
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
              class="rtm-card"
              :class="{
                'rtm-card--default': item.default,
                'rtm-card--selected': selectedTemplateIds.includes(item.id),
                'rtm-card--editing': isEditMode && editingId === item.id,
              }"
            >
              <div class="rtm-card__head">
                <div class="rtm-card__meta">
                  <Checkbox
                    :checked="selectedTemplateIds.includes(item.id)"
                    @change="
                      (e) => toggleTemplateSelection(item.id, e.target.checked)
                    "
                  />
                  <Tag v-if="item.default" color="orange">默认</Tag>
                  <span class="rtm-card__name">{{ item.name }}</span>
                  <Tag
                    :color="
                      item.currency.code === 'RMB' ||
                      item.currency.code === 'CNY'
                        ? 'green'
                        : 'blue'
                    "
                  >
                    {{ item.currency.code }}
                  </Tag>
                </div>
                <Space size="small" class="rtm-card__actions">
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
                  <Button size="small" danger @click="handleDelete(item)">
                    删除
                  </Button>
                </Space>
              </div>
              <div class="rtm-card__body">
                {{ item.template || '(空模板)' }}
              </div>
            </div>

            <div v-if="templateList.length === 0 && !loading" class="rtm-empty">
              暂无模板数据，可在右侧新增
            </div>
          </div>
        </section>
      </div>

      <!-- 右侧：编辑表单 -->
      <aside class="rtm__side">
        <div class="rtm-form">
          <div class="rtm-form__head">
            <span class="rtm-section__indicator" />
            <span class="rtm-form__title">
              {{ isEditMode ? '编辑模板' : '新增模板' }}
            </span>
            <Button
              v-if="isEditMode"
              type="link"
              size="small"
              class="rtm-form__reset"
              @click="handleAdd"
            >
              改为新增
            </Button>
          </div>

          <div class="rtm-form__field">
            <label class="rtm-form__label">模板名称</label>
            <Input
              :value="formData.name"
              placeholder="如: RMB通用模板"
              @update:value="(v) => (formData.name = v)"
            />
          </div>

          <div class="rtm-form__field">
            <label class="rtm-form__label">币别</label>
            <CurrencySelect
              :model-value="formData.currencyId"
              placeholder="请选择币别"
              class="w-full"
              @update:model-value="(v) => updateSelectedCurrencyId(v as number)"
            />
          </div>

          <div class="rtm-form__field">
            <label class="rtm-form__label">所属公司</label>
            <Select
              v-model:value="formData.orgId"
              :options="
                companyList.map((c) => ({ label: c.displayName, value: c.id }))
              "
              placeholder="请选择所属公司"
              class="w-full"
            />
          </div>

          <div class="rtm-form__field">
            <label class="rtm-form__label">模板内容</label>
            <Input.TextArea
              v-model:value="formData.template"
              :rows="8"
              placeholder="输入模板内容，可点击左侧占位符插入..."
              class="rtm-form__textarea"
            />
          </div>

          <div v-if="formData.template" class="rtm-preview">
            <div class="rtm-preview__label">模板预览（示例效果）</div>
            <div class="rtm-preview__content">
              {{ generateExampleText(formData.template) }}
            </div>
          </div>

          <Button
            type="primary"
            block
            size="large"
            class="rtm-form__submit"
            :loading="submitLoading"
            @click="handleSave"
          >
            {{ isEditMode ? '保存修改' : '保存模板' }}
          </Button>
        </div>
      </aside>
    </div>
  </Modal>
</template>

<style scoped>
.rtm {
  display: flex;
  gap: 16px;
  padding: 16px 16px 20px;
  background: #f8fafc;
}

.rtm__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.rtm__side {
  flex-shrink: 0;
  width: 380px;
}

.rtm-section {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.rtm-section__head,
.rtm-toolbar__title,
.rtm-form__head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rtm-section__indicator {
  display: inline-block;
  width: 3px;
  height: 14px;
  background: hsl(var(--primary, 212 100% 45%));
  border-radius: 2px;
}

.rtm-section__title,
.rtm-form__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.rtm-section__hint {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

.rtm-section--placeholders {
  padding: 12px 14px 14px;
}

.rtm-placeholder-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.rtm-chip {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--primary, 212 100% 40%));
  cursor: pointer;
  background: hsl(var(--primary, 212 100% 45%) / 8%);
  border: 1px solid hsl(var(--primary, 212 100% 45%) / 22%);
  border-radius: 999px;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.rtm-chip:hover {
  color: #fff;
  background: hsl(var(--primary, 212 100% 45%));
  border-color: hsl(var(--primary, 212 100% 45%));
  transform: translateY(-1px);
}

.rtm-chip:active {
  transform: translateY(0);
}

.rtm-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.rtm-toolbar__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.rtm-count {
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

.rtm-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.rtm-filter-select {
  width: 140px;
}

.rtm-batch-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: hsl(var(--primary, 212 100% 45%) / 6%);
  border-bottom: 1px solid hsl(var(--primary, 212 100% 45%) / 12%);
}

.rtm-batch-bar__text {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--primary, 212 100% 38%));
}

.rtm-list {
  max-height: 420px;
  padding: 12px 14px 14px;
  overflow-y: auto;
}

.rtm-select-all {
  padding: 6px 10px;
  margin-bottom: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.rtm-card {
  padding: 12px;
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.rtm-card:last-child {
  margin-bottom: 0;
}

.rtm-card:hover {
  border-color: hsl(var(--primary, 212 100% 45%) / 35%);
  box-shadow: 0 4px 12px rgb(15 23 42 / 6%);
}

.rtm-card--default {
  background: linear-gradient(180deg, #fffbeb 0%, #fff 55%);
  border-color: #fbbf24;
}

.rtm-card--selected {
  border-color: hsl(var(--primary, 212 100% 45%) / 55%);
  box-shadow: 0 0 0 2px hsl(var(--primary, 212 100% 45%) / 12%);
}

.rtm-card--editing {
  border-color: hsl(var(--primary, 212 100% 45%));
  box-shadow: 0 0 0 2px hsl(var(--primary, 212 100% 45%) / 18%);
}

.rtm-card__head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.rtm-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.rtm-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.rtm-card__actions {
  flex-shrink: 0;
}

.rtm-card__body {
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.65;
  color: #334155;
  word-break: break-all;
  white-space: pre-wrap;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
}

.rtm-empty {
  padding: 48px 16px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
}

.rtm-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 14px 16px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.rtm-form__head {
  padding-bottom: 4px;
  margin-bottom: 2px;
  border-bottom: 1px solid #f1f5f9;
}

.rtm-form__reset {
  padding-inline: 0;
  margin-left: auto;
}

.rtm-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rtm-form__label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.rtm-form__textarea :deep(textarea) {
  border-radius: 8px;
}

.rtm-preview {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.rtm-preview__label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.rtm-preview__content {
  font-size: 12px;
  line-height: 1.65;
  color: #334155;
  word-break: break-all;
  white-space: pre-wrap;
}

.rtm-form__submit {
  margin-top: 4px;
  border-radius: 8px;
}
</style>

<style>
.remark-template-manage-modal .ant-modal-content {
  overflow: hidden;
  border-radius: 12px;
}

.remark-template-manage-modal .ant-modal-header {
  padding: 14px 20px;
  margin: 0;
  border-bottom: 1px solid #f1f5f9;
}

.remark-template-manage-modal .ant-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
</style>
