<script lang="ts" setup>
import type { MailTemplateAdminApi } from '#/api/mail-template/mail-template-admin';
import type { MailTemplateApi } from '#/api/mail-template/mail-template';

import { onMounted, shallowRef } from 'vue';

import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getMailTemplateModuleOptions } from '#/api/mail-template/mail-template-admin';
import { getMyMailSendRecordPagedList } from '#/api/mail-template/mail-template';
import { createPagedListQuery } from '#/utils/paged-list-query';

const props = defineProps<{
  embedded?: boolean;
  entityId?: string;
  frightModule?: number;
}>();

const moduleOptions = shallowRef<MailTemplateAdminApi.ModuleOption[]>([]);

function moduleName(value?: null | number) {
  if (value === null || value === undefined) {
    return '';
  }
  return (
    moduleOptions.value.find((item) => item.frightModule === value)
      ?.frightModuleName || String(value)
  );
}

const [Grid, gridApi] = useVbenVxeGrid<MailTemplateApi.SendRecord>({
  formOptions: {
    schema: props.embedded
      ? [
          {
            component: 'Input',
            fieldName: 'keyword',
            label: '关键字',
            componentProps: {
              allowClear: true,
              placeholder: '标题、收件人、抄送人',
            },
          },
        ]
      : [
          {
            component: 'Select',
            fieldName: 'frightModule',
            label: '业务模块',
            componentProps: {
              allowClear: true,
              options: [],
              placeholder: '请选择',
            },
          },
          {
            component: 'Input',
            fieldName: 'keyword',
            label: '关键字',
            componentProps: {
              allowClear: true,
              placeholder: '标题、收件人、抄送人',
            },
          },
          {
            component: 'RangePicker',
            fieldName: 'sendTime',
            label: '发送时间',
            componentProps: {
              allowClear: true,
              valueFormat: 'YYYY-MM-DD',
            },
          },
        ],
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: [
      {
        field: 'creationTime',
        formatter: 'formatDateTime',
        minWidth: 160,
        sortable: false,
        title: '发送时间',
      },
      {
        field: 'frightModule',
        formatter: ({ cellValue }) => moduleName(cellValue),
        minWidth: 110,
        sortable: false,
        title: '业务模块',
      },
      {
        field: 'entityNo',
        formatter: ({ cellValue }) => cellValue || '-',
        minWidth: 140,
        sortable: false,
        title: '业务编号',
      },
      {
        field: 'mailTemplateName',
        minWidth: 140,
        showOverflow: 'tooltip',
        sortable: false,
        title: '模板名',
      },
      {
        field: 'subject',
        minWidth: 200,
        showOverflow: 'tooltip',
        sortable: false,
        title: '标题',
      },
      {
        field: 'toAddresses',
        minWidth: 180,
        showOverflow: 'tooltip',
        sortable: false,
        title: '收件人',
      },
      {
        field: 'ccAddresses',
        minWidth: 160,
        showOverflow: 'tooltip',
        sortable: false,
        title: '抄送人',
      },
      {
        field: 'fromAddress',
        minWidth: 180,
        showOverflow: 'tooltip',
        sortable: false,
        title: '发件箱',
      },
    ],
    height: props.embedded ? undefined : 'auto',
    rowConfig: {
      keyField: 'id',
      height: 40,
    },
    pagerConfig: {
      enabled: true,
      pageSize: props.embedded ? 10 : 20,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getMyMailSendRecordPagedList, {
          mapParams: (formValues) => {
            const params: Record<string, any> = {};
            if (
              props.frightModule !== undefined &&
              props.frightModule !== null
            ) {
              params.frightModule = props.frightModule;
            } else if (
              formValues.frightModule !== undefined &&
              formValues.frightModule !== null &&
              formValues.frightModule !== ''
            ) {
              params.frightModule = formValues.frightModule;
            }
            if (props.entityId) {
              params.entityId = props.entityId;
            }
            const keyword = String(formValues.keyword || '').trim();
            if (keyword) {
              params.keyword = keyword;
            }
            const range = formValues.sendTime as string[] | undefined;
            if (range?.[0]) {
              params.sendTimeStart = dayjs(range[0]).format('YYYY-MM-DD');
            }
            if (range?.[1]) {
              params.sendTimeEnd = dayjs(range[1]).format('YYYY-MM-DD');
            }
            return params;
          },
        }),
      },
    },
    toolbarConfig: {
      custom: !props.embedded,
      export: false,
      refresh: { code: 'query' },
      zoom: !props.embedded,
    },
  },
});

onMounted(async () => {
  moduleOptions.value = (await getMailTemplateModuleOptions()) ?? [];
  if (!props.embedded) {
    gridApi.formApi.updateSchema([
      {
        fieldName: 'frightModule',
        componentProps: {
          allowClear: true,
          placeholder: '请选择',
          options: moduleOptions.value.map((item) => ({
            label: item.frightModuleName || String(item.frightModule),
            value: item.frightModule,
          })),
        },
      },
    ]);
  }
});

function reload() {
  gridApi.query();
}

defineExpose({ reload });
</script>

<template>
  <Grid :table-title="embedded ? '' : '发送记录'" />
</template>
