<template>
  <div class="contact-handsontable-container">
    <div class="contact-table-actions mb-2">
      <div class="actions-right">
        <Button type="primary" @click="addRow">
          <IconifyIcon icon="ant-design:plus-outlined" class="size-4" />
          {{ $t('common.create') }}
        </Button>
        <Button type="primary" @click="saveData" class="ml-2" :loading="saving">
          <IconifyIcon icon="ant-design:save-outlined" class="size-4" />
          {{ $t('common.save') }}
        </Button>
      </div>
    </div>
    <div class="handsontable-wrapper">
      <HotTable
        ref="hotTableRef"
        :settings="hotSettings"
        @after-change="onAfterChange"
        @after-create-row="onAfterCreateRow"
        @after-remove-row="onAfterRemoveRow"
        @before-remove-row="onBeforeRemoveRow"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, onMounted, nextTick, watchEffect } from 'vue';
import { HotTable } from '@handsontable/vue3';
import { Button ,Modal,message} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';
import { $t } from '#/locales';
import { setClientContactDisabled, deleteClientContact } from '#/api/sea-export/client-contact-admin';


interface Props {
  clientId?: string;
  modelValue?: ClientContactAdminApi.ClientContactDto[];
}

interface Emits {
  (e: 'update:modelValue', value: ClientContactAdminApi.ClientContactDto[]): void;
  (e: 'save', value: ClientContactAdminApi.ClientContactDto[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  clientId: '',
  modelValue: () => [],
});

const emit = defineEmits<Emits>();

const hotTableRef = ref();
const saving = ref(false); // 保存loading状态

// 初始化数据
const tableData = shallowRef<any[]>([]);

// Handsontable 配置
const hotSettings = shallowRef({
  data: tableData.value,
  columns: [
    {
      data: 'isDisabled',
      title: '状态',
      type: 'dropdown',
      source: ['启用', '禁用'],
      width: 80,
      renderer: function (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        if (value === true || value === '禁用') {
          td.innerHTML = '<span style="color: red;">禁用</span>';
          td.style.backgroundColor = '#ffebee';
        } else {
          td.innerHTML = '<span style="color: green;">启用</span>';
          td.style.backgroundColor = '#e8f5e8';
        }
        return td;
      },
    },
    {
      data: 'name',
      title: '姓名',
      type: 'text',
      width: 120,
      validator: (value: any, callback: (valid: boolean) => void) => {
        if (!value || value.toString().trim() === '') {
          callback(false);
        } else {
          callback(true);
        }
      },
    },
    {
      data: 'mobile',
      title: '手机',
      type: 'text',
      width: 120,
    },
    {
      data: 'email',
      title: '邮箱',
      type: 'text',
      width: 180,
    },
    {
      data: 'tel',
      title: '办公电话',
      type: 'text',
      width: 120,
    },
    {
      data: 'landline',
      title: '座机',
      type: 'text',
      width: 120,
    },
    {
      data: 'position',
      title: '职位',
      type: 'text',
      width: 100,
    },
    {
      data: 'weChat',
      title: '微信号',
      type: 'text',
      width: 120,
    },
    {
      data: 'qq',
      title: 'QQ',
      type: 'text',
      width: 100,
    },
    {
      data: 'isDefault',
      title: '默认',
      type: 'dropdown',
      source: ['是', '否'],
      width: 80,
      renderer: function (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        // 自定义渲染器，显示"是"/"否"
        // 简化渲染器，直接设置HTML内容
        if (value === true || value === '是') {
          td.innerHTML = '是';
        } else {
          td.innerHTML = '否';
        }
        return td;
      },
    },
    {
      data: 'invoiceEnable',
      title: '发票可用',
      type: 'dropdown',
      source: ['是', '否'],
      width: 100,
      renderer: function (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        if (value === true || value === '是') {
          td.innerHTML = '是';
        } else {
          td.innerHTML = '否';
        }
        return td;
      },
    },
    {
      data: 'statementEnable',
      title: '对账可用',
      type: 'dropdown',
      source: ['是', '否'],
      width: 100,
      renderer: function (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        if (value === true || value === '是') {
          td.innerHTML = '是';
        } else {
          td.innerHTML = '否';
        }
        return td;
      },
    },
    {
      data: 'remark',
      title: '备注',
      type: 'text',
      width: 150,
    },

    {
      title: '操作',
      type: 'text',
      width: 150,
      readOnly: true,
      renderer: function (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: any, cellProperties: any) {
        // 清空内容
        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.whiteSpace = 'nowrap';
        
        // 创建操作按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '4px';
        buttonContainer.style.justifyContent = 'center';
        
        // 禁用/启用按钮
        const statusBtn = document.createElement('button');
        const rowData = instance.getSourceDataAtRow(row);
        const isDisabled = rowData?.isDisabled === true || rowData?.isDisabled === '禁用';
        
        statusBtn.textContent = isDisabled ? '启用' : '禁用';
        statusBtn.style.padding = '2px 8px';
        statusBtn.style.fontSize = '12px';
        statusBtn.style.border = '1px solid #ccc';
        statusBtn.style.borderRadius = '4px';
        statusBtn.style.cursor = 'pointer';
        statusBtn.style.backgroundColor = isDisabled ? '#d4edda' : '#f8d7da';
        statusBtn.style.color = isDisabled ? '#155724' : '#721c24';
        
        statusBtn.onclick = async function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const rowData = instance.getSourceDataAtRow(row);
          const contactId = rowData.id;

          if (!contactId || contactId <= 0) {
            // 如果是新增但尚未保存的记录，仅更新本地状态
            const newData = [...tableData.value];
            newData[row].isDisabled = !isDisabled;
            tableData.value = newData;
            instance.setDataAtCell(row, instance.propToCol('isDisabled'), !isDisabled ? '禁用' : '启用');
            return;
          }
          
          try {
            // 调用后端API禁用/启用联系人
            await setClientContactDisabled({
              id: contactId,
              isDisabled: !isDisabled
            });

            // 更新本地数据
            const newData = [...tableData.value];
            newData[row].isDisabled = !isDisabled;
            tableData.value = newData;
            
            // 更新表格显示
            instance.setDataAtCell(row, instance.propToCol('isDisabled'), !isDisabled ? '禁用' : '启用');
            
            message.success(`${!isDisabled ? '禁用' : '启用'}成功`);
          } catch (error) {
            console.error('更新联系人状态失败:', error);
            //message.error(`${!isDisabled ? '禁用' : '启用'}失败: ${error.message || '未知错误'}`);
          }
        };
        
        buttonContainer.appendChild(statusBtn);
        
        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除';
        deleteBtn.style.padding = '2px 8px';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.style.border = '1px solid #dc3545';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.backgroundColor = '#dc3545';
        deleteBtn.style.color = 'white';
        
        deleteBtn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          deleteRow(row);
        };
        
        buttonContainer.appendChild(deleteBtn);
        
        td.appendChild(buttonContainer);
        
        return td;
      },
    },
  ],
  height: 800,
  width: '100%',
  rowHeaders: true,
  colHeaders: true,
  contextMenu: true,
  manualRowResize: true,
  manualColumnResize: true,
  stretchH: 'all',
  autoWrapRow: true,
  autoWrapCol: true,
  columnSorting: true,
  licenseKey: 'non-commercial-and-evaluation',
});

// 添加 beforeOnCellMouseDown 钩子 - 在组件挂载后通过 hotInstance.addHook 添加
onMounted(() => {
  console.log('[Handsontable] onMounted 触发');
  
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    console.log('[Handsontable] 获取 hotInstance:', !!hotInstance);
    
    if (hotInstance) {
      console.log('[Handsontable] 钩子已注册');
    } else {
      console.error('[Handsontable] 无法获取 hotInstance，钩子注册失败');
    }
  });
});

// 更新表格数据
const updateTableData = (contacts: ClientContactAdminApi.ClientContactDto[]) => {
  console.log('[Handsontable] updateTableData 被调用 - 数据量:', contacts.length);
  
  const mappedData = contacts.map(contact => ({
    ...contact,
    isDefault: contact.isDefault ? '是' : '否',
    invoiceEnable: contact.invoiceEnable ? '是' : '否',
    statementEnable: contact.statementEnable ? '是' : '否',
    isDisabled: contact.isDisabled ? '禁用' : '启用',
  }));
  
  console.log('[Handsontable] 映射后的数据示例:', mappedData[0]);
  
  tableData.value = mappedData;
  
  // 更新Handsontable实例数据
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (hotInstance) {
      console.log('[Handsontable] 执行 loadData');
      hotInstance.loadData(tableData.value);
    } else {
      console.warn('[Handsontable] hotInstance 不存在，无法执行 loadData');
    }
  });
};

// 监听数据变化
watchEffect(() => {
  console.log('[Handsontable] watchEffect 触发 - modelValue 长度:', props.modelValue?.length);
  updateTableData(props.modelValue || []);
});

// 监听表格数据变化并同步到父组件
const onAfterChange = (changes: any, source: string) => {
  console.log('[Handsontable] onAfterChange 触发 - source:', source);
  
  if (!changes || changes.length === 0) {
    console.log('[Handsontable] onAfterChange - 无变化数据');
    return;
  }
  
  console.log('[Handsontable] onAfterChange - 变化数量:', changes.length);
  console.log('[Handsontable] onAfterChange - 变化详情:', changes);

  // 同步数据到父组件（如果不是 loadData 操作）
  if (source !== 'loadData') {
    const updatedData = tableData.value.map(row => ({
      ...row,
      isDefault: row.isDefault === '是',
      invoiceEnable: row.invoiceEnable === '是',
      statementEnable: row.statementEnable === '是',
      isDisabled: row.isDisabled === '禁用',
    }));
    
    console.log('[Handsontable] 同步数据到父组件');
    emit('update:modelValue', updatedData as ClientContactAdminApi.ClientContactDto[]);
  }
};

// 新增行
const addRow = () => {
  const newRow = {
    id: 0, // 新增时id为0，提交时由后端分配
    clientId: props.clientId,
    name: '',
    mobile: '',
    email: '',
    tel: '',
    landline: '',
    position: '',
    weChat: '',
    isDefault: '否',
    remark: '',
    qq: '',
    invoiceEnable: '否',
    statementEnable: '否',
    isDisabled: '启用',
  };
  
  tableData.value.push(newRow);
  
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (hotInstance) {
      hotInstance.loadData([...tableData.value]);
      // 滚动到底部并选中新行
      hotInstance.scrollViewportTo(tableData.value.length - 1, 0);
      hotInstance.selectCell(tableData.value.length - 1, 0);
    }
  });
};

// 删除指定行
const deleteRow = async (rowIndex: number) => {
  const rowData = tableData.value[rowIndex];
  if (!rowData) return;

  const contactId = rowData.id;

  Modal.confirm({
    title: '确定要删除这条联系人信息吗？',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        if (contactId && contactId > 0) {
          // 调用后端API删除联系人
          await deleteClientContact({ id: contactId });
          message.success('删除成功');
        } else {
          message.success('已移除未保存的行');
        }
        
        // 从表格中移除行
        tableData.value.splice(rowIndex, 1);
        
        // 更新表格显示
        nextTick(() => {
          const hotInstance = hotTableRef.value?.hotInstance;
          if (hotInstance) {
            hotInstance.loadData([...tableData.value]);
          }
        });
      } catch (error) {
        console.error('删除联系人失败:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        //message.error(`删除失败: ${errorMessage}`);
      }
    }
  });
};

// 保存数据 - 只负责验证和通知父组件
const saveData = async () => {
  if (saving.value) return; // 防止重复提交
  
  saving.value = true;
  
  try {
    const updatedData = tableData.value.map(row => ({
      ...row,
      isDefault: row.isDefault === '是',
      invoiceEnable: row.invoiceEnable === '是',
      statementEnable: row.statementEnable === '是',
      isDisabled: row.isDisabled === '禁用',
    }));
    
    // 通知父组件处理保存逻辑（传递转换后的数据）
    emit('save', updatedData as ClientContactAdminApi.ClientContactDto[]);
    
  } catch (error) {
    console.error('准备保存数据失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    message.error(`数据验证失败: ${errorMessage}`);
  } finally {
    saving.value = false;
  }
};

// 行操作事件
const onAfterCreateRow = (index: number, amount: number) => {
  console.log(`Added ${amount} row(s) at index ${index}`);
};

const onAfterRemoveRow = (index: number, amount: number) => {
  console.log(`Removed ${amount} row(s) starting from index ${index}`);
};

const onBeforeRemoveRow = (index: number, amount: number) => {
  console.log(`About to remove ${amount} row(s) starting from index ${index}`);
};

defineExpose({
  addRow,
  saveData,
  deleteRow,
  updateTableData,
});
</script>

<style scoped>
.contact-handsontable-container {
  width: 100%;
}

.contact-table-actions {
  display: flex;
  flex-direction: row-reverse;
  gap: 8px;
  margin-bottom: 8px;
}

.handsontable-wrapper {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}
</style>
