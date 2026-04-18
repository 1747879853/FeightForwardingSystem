<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Button,
  Card,
  message,
  Space,
  Spin,
  Collapse,
  CollapsePanel,
} from 'ant-design-vue';
import { $t } from '#/locales';
import paymentTermsForm from './form.vue';
import {
  getBillingPeriodPagedList,
  getBillingPeriodList,
} from '#/api/sea-export/billing-period-admin';

const route = useRoute();
const router = useRouter();

const clientId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const page = ref({
  currentPage: 1,
  pageSize: 1000,
  total: 0,
});
const billList = ref<any[]>([]);
/** 加载账单数据 */
const loadData = async () => {
  if (!clientId.value) return;

  try {
    const list = await getBillingPeriodList({
      ClientId: clientId.value,
    });
    console.log('list', list);
    billList.value = list || [];
  } finally {
  }
};

const currentKey = ref(['0']);
onMounted(() => {
  loadData();
});

const updateBillFormList = () => {
  loadData();
};
const addBillingPeriodItem = () => {
  billList.value.push({
    permanent: false,
    effectiveTime: null,
    expiringTime: null,
    bizTypes: [],
    settlementType: 0,
    months: null,
    settlementDay: null,
    days: null,
    remark: null,
    codeSourceIds: [],
    organizationUnitIds: [],
    userIds: [],
  });
  currentKey.value = [String(billList.value.length - 1)];
};
</script>

<template>
  <div class="flex w-[100px] flex-1 flex-col">
    <Button type="primary" @click="addBillingPeriodItem"
      >{{
        $t('ui.actionTitle.create', [$t('seaExport.client.paymentTerms.title')])
      }}
    </Button>
  </div>
  <Collapse v-model:activeKey="currentKey">
    <CollapsePanel
      v-for="(value, index) in billList"
      :header="$t('seaExport.client.paymentTerms.asyncTitle', [index + 1])"
      :key="index"
    >
      <paymentTermsForm
        :billValue="value"
        @update-bill-form-list="updateBillFormList"
      />
    </CollapsePanel>
  </Collapse>
</template>
