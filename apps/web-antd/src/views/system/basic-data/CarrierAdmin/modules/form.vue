<script lang="ts" setup>
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';
import type { Attachment } from '#/api/common/upload';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Input, message, Table } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addCarrier,
  editCarrier,
  getCarrierDetail,
} from '#/api/system/base-data/carrier-admin';
import { $t } from '#/locales';

import { useFormSchema } from '../data';

const emit = defineEmits<{ success: [] }>();
const formData = ref<CarrierAdminApi.CarrierDto>();
const getTitle = computed(() => {
  return formData.value?.id
    ? $t('ui.actionTitle.edit', [$t('system.basicData.carrier.name')])
    : $t('ui.actionTitle.create', [$t('system.basicData.carrier.name')]);
});

type YardRow = {
  /** 表格行 key（本地） */
  _key: string;
  /** 后端堆场 id；编辑保留，新增为 null */
  id?: null | string;
  name: string;
  address?: null | string;
  remark?: null | string;
};

const yardsData = ref<YardRow[]>([]);
let rowKeySeed = 0;

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useFormSchema(),
  showDefaultActions: false,
});

const mapLogoFormValue = (
  logo?: null | CarrierAdminApi.AttachmentItemDto,
): Attachment[] => {
  if (!logo?.attachmentId) {
    return [];
  }
  return [
    {
      attachmentId: logo.attachmentId,
      fileName: logo.friendlyFileName || 'logo',
      filePath: undefined,
      url: logo.url || '',
    },
  ];
};

const buildLogoPayload = (logoValue?: Attachment[]) => {
  const firstAttachment = logoValue?.[0];
  if (!firstAttachment?.attachmentId) {
    return null;
  }
  return {
    attachmentId: Number(firstAttachment.attachmentId),
    displayOrder: 0,
  };
};

const createEmptyRow = (): YardRow => ({
  _key: `row_${++rowKeySeed}_${Date.now()}`,
  id: null,
  name: '',
  address: '',
  remark: '',
});

const mapDetailToRows = (
  yards?: CarrierAdminApi.CarrierYardDto[] | null,
): YardRow[] =>
  (yards ?? []).map((yard, index) => ({
    _key: `row_${yard.id || `${++rowKeySeed}_${index}`}`,
    id: yard.id ?? null,
    name: yard.name ?? '',
    address: yard.address ?? '',
    remark: yard.remark ?? '',
  }));

const addYardRow = () => {
  yardsData.value = [...yardsData.value, createEmptyRow()];
};

const removeYardRow = (key: string) => {
  yardsData.value = yardsData.value.filter((row) => row._key !== key);
};

const patchYardRow = (
  key: string,
  field: keyof Pick<YardRow, 'address' | 'name' | 'remark'>,
  value: unknown,
) => {
  yardsData.value = yardsData.value.map((row) =>
    row._key === key ? { ...row, [field]: value } : row,
  );
};

/** 同船公司下堆场名去空格、大小写不敏感唯一 */
const findDuplicateName = (rows: YardRow[]) => {
  const seen = new Set<string>();
  for (const row of rows) {
    const normalized = String(row.name ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) {
      return String(row.name ?? '').trim();
    }
    seen.add(normalized);
  }
  return null;
};

/** 校验并按行顺序生成提交数组；sortId 由后端生成，不传 */
const collectYards = (): CarrierAdminApi.CarrierYardEditDto[] | null => {
  for (const [index, row] of yardsData.value.entries()) {
    const name = String(row.name ?? '').trim();
    if (!name) {
      message.error(
        $t('system.basicData.carrier.yardNameRequired', [index + 1]),
      );
      return null;
    }
    if (name.length > 128) {
      message.error(
        $t('system.basicData.carrier.yardNameMaxLength', [index + 1]),
      );
      return null;
    }
    if (String(row.address ?? '').length > 512) {
      message.error(
        $t('system.basicData.carrier.yardAddressMaxLength', [index + 1]),
      );
      return null;
    }
  }

  const duplicated = findDuplicateName(yardsData.value);
  if (duplicated) {
    message.error(
      $t('system.basicData.carrier.yardNameDuplicated', [duplicated]),
    );
    return null;
  }

  return yardsData.value.map((row) => ({
    id: row.id ?? null,
    name: String(row.name).trim(),
    address: row.address ? String(row.address) : null,
    remark: row.remark ? String(row.remark) : null,
  }));
};

const [Drawer, drawerApi] = useVbenDrawer({
  class: 'w-[880px]',
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }

    const carrierYards = collectYards();
    if (!carrierYards) return;

    drawerApi.lock();
    const values = await formApi.getValues();

    try {
      if (formData.value?.id) {
        await editCarrier({
          id: formData.value.id,
          cnName: values.cnName,
          cnShortName: values.cnShortName,
          enName: values.enName,
          code: values.code,
          otherCode: values.otherCode,
          ediCode: values.ediCode,
          remark: values.remark,
          logo: buildLogoPayload(values.logo),
          carrierYards,
        });
      } else {
        await addCarrier({
          cnName: values.cnName,
          cnShortName: values.cnShortName,
          enName: values.enName,
          code: values.code,
          otherCode: values.otherCode,
          ediCode: values.ediCode,
          remark: values.remark,
          logo: buildLogoPayload(values.logo),
          carrierYards: carrierYards.map(({ id: _id, ...rest }) => rest),
        });
      }
      message.success($t('ui.actionMessage.operationSuccess'));
      drawerApi.close();
      emit('success');
    } finally {
      drawerApi.lock(false);
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }

    const data = drawerApi.getData<{ id?: number | string }>();
    if (data?.id) {
      drawerApi.lock();
      try {
        const detail = await getCarrierDetail(data.id);
        formData.value = detail;
        formApi.setValues({
          cnName: detail.cnName,
          cnShortName: detail.cnShortName,
          enName: detail.enName,
          code: detail.code,
          otherCode: detail.otherCode,
          ediCode: detail.ediCode,
          remark: detail.remark,
          logo: mapLogoFormValue(detail.logo),
        });
        yardsData.value = mapDetailToRows(detail.carrierYards);
      } finally {
        drawerApi.lock(false);
      }
    } else {
      formData.value = undefined;
      formApi.resetForm();
      yardsData.value = [];
    }
  },
});
</script>

<template>
  <Drawer :title="getTitle">
    <Form class="mx-4" />

    <div class="mx-4 mt-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">
          {{ $t('system.basicData.carrier.yards') }}
        </span>
        <Button type="dashed" size="small" @click="addYardRow">
          <IconifyIcon icon="mdi:plus" class="mr-1 size-4" />
          {{ $t('system.basicData.carrier.addYard') }}
        </Button>
      </div>
      <Table
        :data-source="yardsData"
        :pagination="false"
        size="small"
        row-key="_key"
        bordered
      >
        <Table.Column
          :title="$t('system.basicData.carrier.yardName')"
          key="name"
          :min-width="180"
        >
          <template #default="{ record }">
            <Input
              :value="record.name"
              :maxlength="128"
              :placeholder="$t('ui.placeholder.input')"
              allow-clear
              @update:value="(v) => patchYardRow(record._key, 'name', v)"
            />
          </template>
        </Table.Column>
        <Table.Column
          :title="$t('system.basicData.carrier.yardAddress')"
          key="address"
          :min-width="220"
        >
          <template #default="{ record }">
            <Input
              :value="record.address"
              :maxlength="512"
              :placeholder="$t('ui.placeholder.input')"
              allow-clear
              @update:value="(v) => patchYardRow(record._key, 'address', v)"
            />
          </template>
        </Table.Column>
        <Table.Column
          :title="$t('system.basicData.carrier.remark')"
          key="remark"
          :min-width="160"
        >
          <template #default="{ record }">
            <Input
              :value="record.remark"
              :maxlength="1024"
              :placeholder="$t('ui.placeholder.input')"
              allow-clear
              @update:value="(v) => patchYardRow(record._key, 'remark', v)"
            />
          </template>
        </Table.Column>
        <Table.Column
          :title="$t('system.basicData.operation')"
          key="action"
          width="72"
          align="center"
        >
          <template #default="{ record }">
            <Button
              type="link"
              danger
              size="small"
              @click="removeYardRow(record._key)"
            >
              {{ $t('common.delete') }}
            </Button>
          </template>
        </Table.Column>
      </Table>
      <div class="mt-1 text-xs text-gray-400">
        {{ $t('system.basicData.carrier.yardTableTip') }}
      </div>
    </div>
  </Drawer>
</template>
