<script setup lang="ts">
import type { Attachment } from '#/api/common/upload';
import type { BillAction, BillOfLading } from '#/api/bill-of-lading';
import { computed, ref } from 'vue';
import {
  DatePicker,
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  message,
} from 'ant-design-vue';
import dayjs from 'dayjs';
import CodeIssueTypeSelect from '#/adapter/component/biz-select/code-issue-type-select.vue';
import FileUploadInput from '#/adapter/component/file-upload/file-upload-input.vue';
import { getBill, runBillAction } from '#/api/bill-of-lading';
import {
  actionLabels,
  billNumber,
  selectionError,
  signOutOptions,
} from './rules';

const emit = defineEmits<{ success: [] }>();
const visible = ref(false);
const busy = ref(false);
const action = ref<BillAction>('SignIn');
const rows = ref<BillOfLading[]>([]);
const date = ref<string>();
const remark = ref('');
const attachments = ref<Attachment[]>([]);
const uploaders = ref<InstanceType<typeof FileUploadInput>[]>([]);
const signInUploader = ref<InstanceType<typeof FileUploadInput>>();
const uploading = computed(
  () =>
    signInUploader.value?.isUploading ||
    uploaders.value.some((uploader) => uploader.isUploading),
);
const issueType = ref<number | string>();
const signOutType = ref<number>();
const overdue = ref<
  Record<string, { date?: string; remark: string; attachments: Attachment[] }>
>({});
const requiresDate = computed(() =>
  ['SignIn', 'SignOut', 'Swap', 'Deduct'].includes(action.value),
);
const overdueRows = computed(() => rows.value.filter((row) => row.isOverdue));
const settlementName = computed(() => rows.value[0]?.settlement?.name || '');
const numberText = computed(() =>
  rows.value
    .map((row) =>
      (row.isSeparate
        ? row.seaExportSeparate?.blNum
        : row.seaExport.transportOrder.mblNum
      )?.trim(),
    )
    .filter(Boolean)
    .join('、'),
);
const modalWidth = computed(() =>
  action.value === 'Submit' && !overdueRows.value.length ? 420 : 640,
);
const fileInputs = (files: Attachment[]) =>
  files.map((file, displayOrder) => ({
    attachmentId: String(file.attachmentId),
    displayOrder,
    clientVisible: false,
  }));

async function open(nextAction: BillAction, selected: BillOfLading[]) {
  if (busy.value) return;
  const error = selectionError(selected, nextAction);
  if (error) {
    message.warning(error);
    return;
  }
  busy.value = true;
  try {
    // Re-read before opening so stale list selection cannot bypass state validation.
    const fresh = await Promise.all(selected.map((row) => getBill(row.id)));
    const latestError = selectionError(fresh, nextAction);
    if (latestError) {
      message.warning(latestError);
      return;
    }
    rows.value = fresh;
    action.value = nextAction;
    date.value = dayjs().format('YYYY-MM-DD');
    remark.value = '';
    attachments.value = [];
    issueType.value = undefined;
    signOutType.value = undefined;
    overdue.value = Object.fromEntries(
      fresh
        .filter((row) => row.isOverdue)
        .map((row) => [
          row.id,
          { date: undefined, remark: '', attachments: [] },
        ]),
    );
    visible.value = true;
  } finally {
    busy.value = false;
  }
}
defineExpose({ open });

async function submit() {
  if (busy.value) return;
  if (uploading.value) {
    message.warning('请等待附件上传完成');
    return;
  }
  const error = selectionError(rows.value, action.value);
  if (error) {
    message.warning(error);
    return;
  }
  if (requiresDate.value && !date.value) {
    message.warning('请选择操作日期');
    return;
  }
  if (action.value === 'SignIn' && attachments.value.length !== 1) {
    message.warning('签入必须且只能上传一个扫描件');
    return;
  }
  if (
    action.value === 'SignOut' &&
    (!issueType.value || signOutType.value === undefined)
  ) {
    message.warning('请选择签单方式和签出方式');
    return;
  }
  if (action.value === 'Submit') {
    for (const row of overdueRows.value) {
      const item = overdue.value[row.id]!;
      if (!item.date || !item.remark.trim() || !item.attachments.length) {
        message.warning(
          `${billNumber(row)}：请填写承诺付款日期、超期备注并上传证明附件`,
        );
        return;
      }
      const due =
        row.seaExport.transportOrder.settlementDate ?? row.settlementDate;
      if (!due || !dayjs(item.date).isAfter(dayjs(due), 'day')) {
        message.warning(`${billNumber(row)}：承诺付款日期必须晚于主单应结日期`);
        return;
      }
    }
  }
  busy.value = true;
  try {
    const id = rows.value[0]!.id;
    const ids = rows.value.map((row) => row.id);
    const common = { remark: remark.value.trim() };
    switch (action.value) {
      case 'SignIn':
        await runBillAction('SignIn', {
          id,
          signInDate: date.value!,
          attachments: fileInputs(attachments.value),
          ...common,
        });
        break;
      case 'Swap':
        await runBillAction('Swap', { ids, swapDate: date.value!, ...common });
        break;
      case 'Deduct':
        await runBillAction('Deduct', {
          ids,
          deductDate: date.value!,
          ...common,
        });
        break;
      case 'SignOut':
        await runBillAction('SignOut', {
          ids,
          signOutDate: date.value!,
          codeIssueTypeId: String(issueType.value),
          signOutType: signOutType.value!,
          ...common,
        });
        break;
      case 'Submit':
        await runBillAction('Submit', {
          items: rows.value.map((row) => {
            const item = overdue.value[row.id];
            return row.isOverdue && item
              ? {
                  id: row.id,
                  promisePayDate: item.date,
                  overdueRemark: item.remark.trim(),
                  overdueAttachments: fileInputs(item.attachments),
                }
              : { id: row.id };
          }),
        });
        break;
      case 'UnSubmit':
        await runBillAction('UnSubmit', {
          taskBaseId: rows.value[0]!.taskBaseId!,
        });
        break;
      default:
        await runBillAction(action.value, { id, ...common });
    }
    message.success(`${actionLabels[action.value]}成功`);
    visible.value = false;
    emit('success');
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <Modal
    v-model:open="visible"
    :title="actionLabels[action]"
    :width="modalWidth"
    :confirm-loading="busy"
    :ok-button-props="{ disabled: uploading }"
    :mask-closable="false"
    :closable="!busy"
    :cancel-button-props="{ disabled: busy }"
    class="bill-action-modal"
    @ok="submit"
  >
    <div class="summary">
      <p class="summary__title">
        {{ rows.length }} 张提单
        <template v-if="action === 'Submit' && settlementName">
          · {{ settlementName }}
        </template>
      </p>
      <p v-if="numberText" class="summary__sub">{{ numberText }}</p>
    </div>
    <p v-if="action === 'UnSubmit'" class="hint">
      撤销这张提单所在的整批审核。已有审核结果时不能撤销。
    </p>
    <Form
      v-if="action !== 'Submit' || overdueRows.length"
      class="action-form"
      layout="vertical"
    >
      <FormItem v-if="requiresDate" label="操作日期" required
        ><DatePicker
          v-model:value="date"
          value-format="YYYY-MM-DD"
          class="w-full"
          :disabled="busy"
      /></FormItem>
      <FormItem v-if="action === 'SignIn'" label="提单扫描件（一个）" required
        ><FileUploadInput
          ref="signInUploader"
          v-model="attachments"
          :max-count="1"
          drag
          :disabled="busy"
      /></FormItem>
      <template v-if="action === 'SignOut'">
        <FormItem label="签单方式" required
          ><CodeIssueTypeSelect
            v-model="issueType"
            :allow-clear="false"
            :disabled="busy"
            class="w-full"
        /></FormItem>
        <FormItem label="签出方式" required
          ><Select
            v-model:value="signOutType"
            :options="signOutOptions"
            :disabled="busy"
        /></FormItem>
        <p class="hint">签单方式回填到业务。分单签出同时回填所属主单。</p>
      </template>
      <template v-if="action === 'Submit'">
        <section v-for="row in overdueRows" :key="row.id" class="overdue-card">
          <p class="overdue-card__head">
            <span>{{ billNumber(row) }}</span>
            <span>
              应结
              {{
                (
                  row.seaExport.transportOrder.settlementDate ??
                  row.settlementDate
                )?.slice(0, 10) || '未维护'
              }}
            </span>
          </p>
          <FormItem label="承诺付款日期" required
            ><DatePicker
              v-model:value="overdue[row.id]!.date"
              value-format="YYYY-MM-DD"
              :disabled="busy"
          /></FormItem>
          <FormItem label="超期备注" required
            ><Input.TextArea
              v-model:value="overdue[row.id]!.remark"
              :maxlength="1024"
              :disabled="busy"
          /></FormItem>
          <FormItem label="证明附件" required
            ><FileUploadInput
              ref="uploaders"
              v-model="overdue[row.id]!.attachments"
              drag
              :disabled="busy"
          /></FormItem>
        </section>
      </template>
      <FormItem v-else-if="action !== 'UnSubmit'" label="备注"
        ><Input.TextArea
          v-model:value="remark"
          :maxlength="1024"
          :rows="3"
          :disabled="busy"
      /></FormItem>
    </Form>
  </Modal>
</template>
<style scoped>
.summary__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
  color: #1f2329;
}

.summary__sub {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 20px;
  color: #5b6472;
  word-break: break-all;
}

.action-form {
  margin-top: 16px;
}

.hint {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 20px;
  color: #8c95a3;
}

.overdue-card {
  padding: 14px 14px 2px;
  margin-top: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.overdue-card__head {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}

.overdue-card__head span:last-child {
  font-weight: 400;
  color: #8c95a3;
}
</style>
