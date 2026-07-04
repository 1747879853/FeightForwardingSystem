<script lang="ts" setup>
import { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
} from 'ant-design-vue';

import {
  addInvoiceIssue,
  editInvoiceIssue,
  getInvoiceIssueDetail,
} from '#/api/Invoice/InvoiceIssue';
import { $t } from '#/locales';

const route = useRoute();
const router = useRouter();
const formRef = ref();
const loading = ref(false);
const submitting = ref(false);

/** 表单数据 */
const formData = ref<Partial<InvoiceIssueApi.InvoiceIssueAddDto>>({
  invoiceIssueType: InvoiceIssueApi.InvoiceIssueType.ManualRecord,
  invoiceIssueTime: new Date().toISOString(),
  invoiceIssueItems: [],
  invoiceIssueGoodsDtls: [],
});

/** 是否是编辑模式 */
const isEditMode = computed(() => !!route.params.id);

/** 页面标题 */
const pageTitle = computed(() =>
  isEditMode.value ? '编辑发票开出' : '新建发票开出',
);

/** 加载详情数据 */
async function loadDetail(id: string) {
  loading.value = true;
  try {
    const detail = await getInvoiceIssueDetail(id);
    formData.value = {
      ...detail,
      id: detail.id,
    };
  } catch (error) {
    console.error('加载详情失败:', error);
    message.error('加载详情失败');
  } finally {
    loading.value = false;
  }
}

/** 监听路由参数变化 */
watch(
  () => route.params.id,
  (id) => {
    if (id) {
      loadDetail(id as string);
    }
  },
  { immediate: true },
);

/** 添加开票申请 */
function handleAddApplication() {
  // TODO: 打开选择开票申请的模态框
  message.info('选择开票申请功能待实现');
}

/** 删除开票申请 */
function handleDeleteApplication(index: number) {
  formData.value.invoiceIssueItems?.splice(index, 1);
}

/** 添加商品明细 */
function handleAddGoods() {
  // TODO: 打开选择商品的模态框
  message.info('选择商品功能待实现');
}

/** 删除商品明细 */
function handleDeleteGoods(index: number) {
  formData.value.invoiceIssueGoodsDtls?.splice(index, 1);
}

/** 计算商品明细合计 */
const goodsTotalAmount = computed(() => {
  return (
    formData.value.invoiceIssueGoodsDtls?.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    ) || 0
  );
});

const goodsTotalNoTaxAmount = computed(() => {
  return (
    formData.value.invoiceIssueGoodsDtls?.reduce(
      (sum, item) => sum + (item.noTaxAmount || 0),
      0,
    ) || 0
  );
});

const goodsTotalTaxAmount = computed(() => {
  return (
    formData.value.invoiceIssueGoodsDtls?.reduce(
      (sum, item) => sum + (item.taxAmount || 0),
      0,
    ) || 0
  );
});

/** 提交表单 */
async function handleSubmit() {
  try {
    await formRef.value?.validate();

    // 校验至少有一条开票申请
    if (!formData.value.invoiceIssueItems?.length) {
      message.warning('请至少添加一条开票申请');
      return;
    }

    // 校验至少有一条商品明细
    if (!formData.value.invoiceIssueGoodsDtls?.length) {
      message.warning('请至少添加一条商品明细');
      return;
    }

    submitting.value = true;

    if (isEditMode.value) {
      await editInvoiceIssue(
        formData.value as InvoiceIssueApi.InvoiceIssueEditDto,
      );
      message.success('修改成功');
    } else {
      await addInvoiceIssue(
        formData.value as InvoiceIssueApi.InvoiceIssueAddDto,
      );
      message.success('新建成功');
    }

    router.push('/settlement-management/invoice-issue');
  } catch (error) {
    console.error('提交失败:', error);
    message.error(isEditMode.value ? '修改失败' : '新建失败');
  } finally {
    submitting.value = false;
  }
}

/** 取消 */
function handleCancel() {
  Modal.confirm({
    title: '确认取消',
    content: '确定要取消吗？未保存的数据将丢失。',
    onOk: () => {
      router.push('/settlement-management/invoice-issue');
    },
  });
}
</script>

<template>
  <Page auto-content-height :title="pageTitle">
    <Card :loading="loading">
      <Form
        ref="formRef"
        :model="formData"
        layout="vertical"
        class="invoice-issue-form"
      >
        <!-- 基本信息 -->
        <Divider orientation="left">基本信息</Divider>
        <div class="grid grid-cols-3 gap-4">
          <Form.Item
            label="开票方式"
            name="invoiceIssueType"
            :rules="[{ required: true, message: '请选择开票方式' }]"
          >
            <Select
              v-model:value="formData.invoiceIssueType"
              placeholder="请选择开票方式"
            >
              <Select.Option
                :value="InvoiceIssueApi.InvoiceIssueType.NuonuoInterface"
              >
                诺诺接口开票
              </Select.Option>
              <Select.Option
                :value="InvoiceIssueApi.InvoiceIssueType.ManualRecord"
              >
                手动记录
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="发票号" name="invoiceNo">
            <Input
              v-model:value="formData.invoiceNo"
              placeholder="请输入发票号"
            />
          </Form.Item>

          <Form.Item
            label="开票时间"
            name="invoiceIssueTime"
            :rules="[{ required: true, message: '请选择开票时间' }]"
          >
            <DatePicker
              v-model:value="formData.invoiceIssueTime"
              show-time
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="请选择开票时间"
              style="width: 100%"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </Form.Item>

          <Form.Item label="开票要求" name="require">
            <Input
              v-model:value="formData.require"
              placeholder="请输入开票要求"
            />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea
              v-model:value="formData.remark"
              placeholder="请输入备注"
              :rows="2"
            />
          </Form.Item>
        </div>

        <!-- 开票申请明细 -->
        <Divider orientation="left">
          开票申请明细
          <Button
            type="link"
            size="small"
            @click="handleAddApplication"
            style="margin-left: 8px"
          >
            + 添加
          </Button>
        </Divider>
        <Table
          :data-source="formData.invoiceIssueItems || []"
          :pagination="false"
          size="small"
          bordered
        >
          <template #columns>
            <Table.Column title="序号" width="60">
              <template #default="{ index }">
                {{ index + 1 }}
              </template>
            </Table.Column>
            <Table.Column title="申请单号" data-index="applicationNo" />
            <Table.Column title="发票号" data-index="invoiceNo" />
            <Table.Column title="结算对象" data-index="settlementName" />
            <Table.Column title="币别" data-index="currencyCode" />
            <Table.Column title="备注" data-index="remark" />
            <Table.Column title="操作" width="100">
              <template #default="{ index }">
                <Button
                  type="link"
                  danger
                  size="small"
                  @click="handleDeleteApplication(index)"
                >
                  删除
                </Button>
              </template>
            </Table.Column>
          </template>
        </Table>

        <!-- 商品明细 -->
        <Divider orientation="left">
          商品明细
          <Button
            type="link"
            size="small"
            @click="handleAddGoods"
            style="margin-left: 8px"
          >
            + 添加
          </Button>
        </Divider>
        <Table
          :data-source="formData.invoiceIssueGoodsDtls || []"
          :pagination="false"
          size="small"
          bordered
          :scroll="{ x: 'max-content' }"
        >
          <template #columns>
            <Table.Column title="序号" width="60">
              <template #default="{ index }">
                {{ index + 1 }}
              </template>
            </Table.Column>
            <Table.Column title="商品编码" data-index="codeInvoiceName" />
            <Table.Column title="规格型号" data-index="specification" />
            <Table.Column title="单位" data-index="unit" width="80" />
            <Table.Column
              title="数量"
              data-index="quantity"
              width="100"
              align="right"
            />
            <Table.Column
              title="含税单价"
              data-index="unitPrice"
              width="120"
              align="right"
            />
            <Table.Column
              title="金额"
              data-index="amount"
              width="120"
              align="right"
            />
            <Table.Column
              title="不含税金额"
              data-index="noTaxAmount"
              width="120"
              align="right"
            />
            <Table.Column
              title="税率(%)"
              data-index="taxRate"
              width="100"
              align="right"
            />
            <Table.Column
              title="税额"
              data-index="taxAmount"
              width="120"
              align="right"
            />
            <Table.Column title="备注" data-index="remark" />
            <Table.Column title="操作" width="100">
              <template #default="{ index }">
                <Button
                  type="link"
                  danger
                  size="small"
                  @click="handleDeleteGoods(index)"
                >
                  删除
                </Button>
              </template>
            </Table.Column>
          </template>
        </Table>

        <!-- 合计行 -->
        <div class="mt-4 rounded border bg-gray-50 p-3">
          <div class="grid grid-cols-3 gap-4 text-right">
            <div>
              <span class="font-medium">金额合计：</span>
              <span class="text-blue-600">{{
                goodsTotalAmount.toFixed(2)
              }}</span>
            </div>
            <div>
              <span class="font-medium">不含税金额合计：</span>
              <span class="text-blue-600">{{
                goodsTotalNoTaxAmount.toFixed(2)
              }}</span>
            </div>
            <div>
              <span class="font-medium">税额合计：</span>
              <span class="text-blue-600">{{
                goodsTotalTaxAmount.toFixed(2)
              }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="mt-6 flex justify-end space-x-2">
          <Button @click="handleCancel">取消</Button>
          <Button type="primary" :loading="submitting" @click="handleSubmit">
            提交
          </Button>
        </div>
      </Form>
    </Card>
  </Page>
</template>

<style scoped>
.invoice-issue-form {
  max-width: 100%;
}
</style>
