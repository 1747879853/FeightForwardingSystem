<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, Card, message, Space, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';
import { useVbenForm } from '#/adapter/form';
import { getAreaAndParents } from '#/api/common/area';
import { $t } from '#/locales';
import { useBillFormSchema } from './paymentTermsData';

import {
  addBillingPeriod,
  editBillingPeriod,
  deleteBillingPeriod,
} from '#/api/sea-export/billing-period-admin';

const route = useRoute();
const router = useRouter();

const clientId = computed(() => {
  const id = route.params.id;
  return id ? Number(id) : 0;
});

interface Props {
  billValue: {
    id?: number;
    permanent: boolean;
    effectiveTime: string;
    expiringTime?: string;
    bizTypes: string[];
    settlementType: number;
    months?: number;
    settlementDay?: number;
    days?: number;
    remark?: string;
    cbpCodeSources?: Object[]; // 业务来源
    cbpOrgs?: Object[];
    cbpUsers?: Object[];
  };
}

const submitting = ref(false);

const props = defineProps<Props>();

const emit = defineEmits(['updateBillFormList']);

const editId = computed(() => props.billValue.id);

const billFormSchema = useBillFormSchema();
const [BillForm, billFormApi] = useVbenForm({
  layout: 'vertical',
  compact: true,
  schema: billFormSchema,
  showDefaultActions: false,
  wrapperClass: 'grid-cols-3',
  handleValuesChange: (values) => {
    if (values.settlementType !== undefined) {
      if (values.settlementType === 1) {
        billFormApi.updateSchema([
          { fieldName: 'months', hide: false },
          { fieldName: 'settlementDay', hide: false },
          { fieldName: 'days', hide: true },
        ]);
      } else if (values.settlementType === 2) {
        billFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: false },
        ]);
      } else {
        billFormApi.updateSchema([
          { fieldName: 'months', hide: true },
          { fieldName: 'settlementDay', hide: true },
          { fieldName: 'days', hide: true },
        ]);
      }
    }
    if (values.permanent !== undefined && values.permanent) {
      billFormApi.updateSchema([{ fieldName: 'expiringTime', disabled: true }]);
      billFormApi.setValues({ expiringTime: '' });
    } else if (values.permanent !== undefined && !values.permanent) {
      billFormApi.updateSchema([
        { fieldName: 'expiringTime', disabled: false },
      ]);
    }
  },
});
/** DatePicker 需要的 dayjs 对象，API 返回的是字符串 */
const toDayjs = (val: string | null | undefined) =>
  val && dayjs(val).isValid() ? dayjs(val) : undefined;

watch(
  () => props.billValue,
  (newVal) => {
    console.log('父组件传入的 billValue 变化了', newVal, newVal.id);
    if (editId.value) {
      // 编辑时加载数据到表单
      console.log('编辑时加载数据到表单', newVal);
      billFormApi.setValues({
        permanent: newVal.permanent,
        effectiveTime: toDayjs(newVal.effectiveTime),
        expiringTime: toDayjs(newVal.expiringTime),
        bizTypes: newVal.bizTypes,
        settlementType: newVal.settlementType,
        months: newVal.months,
        settlementDay: newVal.settlementDay,
        days: newVal.days,
        remark: newVal.remark,
        codeSourceIds:
          newVal.cbpCodeSources?.map((item) => item?.codeSourceId) || [],
        orgsIds: newVal.cbpOrgs?.map((item) => item?.orgId) || [],
        userIds: newVal.cbpUsers?.map((item) => item?.userId) || [],
      });
    } else {
      // 创建时重置表单
      billFormApi.resetForm();
    }
  },
  { deep: true, immediate: true },
);

/** 提交表单 */
const handleSubmit = async () => {
  const { valid } = await billFormApi.validate();
  if (!valid) return;

  submitting.value = true;
  const values = await billFormApi.getValues();

  try {
    if (editId.value) {
      console.log('编辑账单提交的值', values);
      await editBillingPeriod({
        id: editId.value,
        clientId: clientId.value,
        /**长期有效  */
        permanent: values.permanent,
        /** 生效时间 */
        effectiveTime: values.effectiveTime,
        /** 失效时间 */
        expiringTime: values.expiringTime,
        /** 业务类型 */
        bizTypes: values.bizTypes,
        /** 结算方式 */
        settlementType: values.settlementType,
        /** 结算月数 */
        months: values.months,
        /** 结算日 */
        settlementDay: values.settlementDay,
        /** 结算天数 */
        days: values.days,
        /** 备注   */
        remark: values.remark,
        /** 业务来源 */
        codeSourceIds: values.codeSourceIds || [],
        /** 组织id */
        orgsIds: values.orgsIds || [],
        /** 用户id */
        userIds: values.userIds || [],
      });
      message.success($t('ui.actionMessage.operationSuccess'));
    } else {
      console.log('新增账单提交的值', values);
      await addBillingPeriod({
        clientId: clientId.value,
        /**长期有效  */
        permanent: values.permanent,
        /** 生效时间 */
        effectiveTime: values.effectiveTime,
        /** 失效时间 */
        expiringTime: values.expiringTime,
        /** 业务类型 */
        bizTypes: values.bizTypes,
        /** 结算方式 */
        settlementType: values.settlementType,
        /** 结算月数 */
        months: values.months,
        /** 结算日 */
        settlementDay: values.settlementDay,
        /** 结算天数 */
        days: values.days,
        /** 备注   */
        remark: values.remark,
        /** 业务来源 */
        codeSourceIds: values.codeSourceIds || [],
        /** 组织id */
        orgsIds: values.orgsIds || [],
        /** 用户id */
        userIds: values.userIds || [],
      });
      message.success($t('ui.actionMessage.operationSuccess'));
    }
  } finally {
    submitting.value = false;
  }
};

/** 删除 */
const handleDelete = () => {
  if (props.billValue.id) {
    deleteBillingPeriod(props.billValue.id).then(() => {
      message.success($t('ui.actionMessage.operationSuccess'));
      emit('updateBillFormList');
    });
  } else {
    message.error($t('ui.actionMessage.operationFailed'));
  }
};

onMounted(() => {});
</script>

<template>
  <Card>
    <BillForm class="mx-4" />
    <template #actions>
      <Space>
        <Button type="primary" @click="handleSubmit" :loading="submitting">
          {{ $t('common.confirm') }}
        </Button>
        <Button type="default" @click="handleDelete">
          {{ $t('common.delete') }}
        </Button>
      </Space>
    </template>
  </Card>
</template>
