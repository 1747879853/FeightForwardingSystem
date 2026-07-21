<template>
  <div class="contact-handsontable-container">
    <div class="contact-table-actions mb-2">
      <div class="actions-right">
        <Button type="primary" @click="addRow">
          <IconifyIcon icon="ant-design:plus-outlined" class="size-4" />
          {{ $t('common.create') }}
        </Button>
        <Button type="primary" @click="saveData" class="ml-2">
          <IconifyIcon icon="ant-design:save-outlined" class="size-4" />
          {{ $t('common.save') }}
        </Button>
        <Button @click="deleteSelectedRows" class="ml-2" :disabled="!hasSelectedRows">
          <IconifyIcon icon="ant-design:delete-outlined" class="size-4" />
          {{ $t('common.delete') }}
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
        @after-selection="onAfterSelection"
        @after-render="onAfterRender"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, onMounted, nextTick, watchEffect, computed } from 'vue';
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
  (e: 'save'): void;
}

const props = withDefaults(defineProps<Props>(), {
  clientId: '',
  modelValue: () => [],
});

const emit = defineEmits<Emits>();

const hotTableRef = ref();
const selectedRowIndexes = ref<number[]>([]);

// 计算属性：是否有选中的行
const hasSelectedRows = computed(() => selectedRowIndexes.value.length > 0);

// 初始化数据
const tableData = shallowRef<any[]>([]);

// Handsontable 配置
const hotSettings = shallowRef({
  data: tableData.value,
  columns: [
    {
      data: 'checkbox',
      title: '<input type="checkbox" id="select-all-checkbox">',
      type: 'checkbox',
      width: 40,
      className: 'htCenter htMiddle'
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
          
          const rowData = instance.getSourceDataAtRow(row);
          const contactId = rowData.id;

          if (!contactId || contactId <= 0) {
            // 如果是新增但尚未保存的记录，直接从表格中删除
            instance.alter('remove_row', row, 1);
            return;
          }
          
          Modal.confirm({
            title: '确定要删除这条联系人信息吗？',
            okText: '确定',
            cancelText: '取消',
            onOk: async () => {
              try {
                // 调用后端API删除联系人
                await deleteClientContact({ id: contactId });
                
                // 从表格中移除行
                instance.alter('remove_row', row, 1);
                
                message.success('删除成功');
              } catch (error) {
                console.error('删除联系人失败:', error);
                //message.error(`删除失败: ${error.message || '未知错误'}`);
              }
            }
          });
        };
        
        buttonContainer.appendChild(deleteBtn);
        
        td.appendChild(buttonContainer);
        
        return td;
      },
    },
  ],
  height: 400,
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
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (hotInstance) {
      hotInstance.addHook('beforeOnCellMouseDown', (event: MouseEvent, coords: any, td: HTMLElement) => {
        const colIndex = coords.col;
        
        // 如果点击的是复选框列（索引0）
        if (colIndex === 0) {
          event.preventDefault();
          event.stopPropagation();
          
          const rowIndex = coords.row;
          const currentValue = hotInstance.getDataAtRowProp(rowIndex, 'checkbox');
          const newValue = !currentValue;
          
          // 更新数据
          hotInstance.setDataAtCell(rowIndex, colIndex, newValue);
        }
      });
    }
  });
});

// 更新表格数据
const updateTableData = (contacts: ClientContactAdminApi.ClientContactDto[]) => {
  const mappedData = contacts.map(contact => ({
    ...contact,
    checkbox: false, // 添加复选框状态
    isDefault: contact.isDefault ? '是' : '否',
    invoiceEnable: contact.invoiceEnable ? '是' : '否',
    statementEnable: contact.statementEnable ? '是' : '否',
    isDisabled: contact.isDisabled ? '禁用' : '启用',
  }));
  
  tableData.value = mappedData;
  
  // 更新Handsontable实例数据
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (hotInstance) {
      hotInstance.loadData(tableData.value);
    }
  });
};

// 监听数据变化
watchEffect(() => {
  updateTableData(props.modelValue || []);
});

// 监听表格数据变化并同步到父组件
const onAfterChange = (changes: any, source: string) => {
  if (!changes || changes.length === 0) return;
  
  // 更新 selectedRowIndexes
  const newSelectedIndexes: number[] = [];
  
  // 先更新 tableData 中的 checkbox 值
  for (const change of changes) {
    const [row, prop, oldValue, newValue] = change;
    if (prop === 'checkbox' && tableData.value[row]) {
      tableData.value[row].checkbox = newValue;
    }
  }
  
  // 重新计算选中索引 - 遍历所有行确保数据一致性
  for (let i = 0; i < tableData.value.length; i++) {
    if (tableData.value[i]?.checkbox) {
      newSelectedIndexes.push(i);
    }
  }
  
  selectedRowIndexes.value = newSelectedIndexes;
  
  // 同步数据到父组件（如果不是 loadData 操作）
  if (source !== 'loadData') {
    const updatedData = tableData.value.map(row => ({
      ...row,
      isDefault: row.isDefault === '是',
      invoiceEnable: row.invoiceEnable === '是',
      statementEnable: row.statementEnable === '是',
      isDisabled: row.isDisabled === '禁用',
    }));
    
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

// 删除选中行
const deleteSelectedRows = async () => {
  if (selectedRowIndexes.value.length === 0) return;
  
  // 获取选中行中已有ID的联系人(需要调用后端API删除的)
  const rowsToDelete = tableData.value.filter((row, index) => 
    selectedRowIndexes.value.includes(index) && row.id > 0
  );

  try {
    // 批量删除选中的已有联系人
    for (const row of rowsToDelete) {
      await deleteClientContact({ id: row.id });
    }

    // 从表格中移除所有选中的行(包括新增但未保存的行)
    const sortedIndexes = [...selectedRowIndexes.value].sort((a, b) => b - a);
    for (const index of sortedIndexes) {
      tableData.value.splice(index, 1);
    }

    // 更新表格数据
    nextTick(() => {
      const hotInstance = hotTableRef.value?.hotInstance;
      if (hotInstance) {
        hotInstance.loadData([...tableData.value]);
        selectedRowIndexes.value = [];
      }
    });

    message.success('删除成功');
  } catch (error) {
    console.error('删除联系人失败:', error);
    //message.error(`删除失败: ${error.message || '未知错误'}`);
  }
};

// 保存数据
const saveData = () => {
  const updatedData = tableData.value.map(row => ({
    ...row,
    isDefault: row.isDefault === '是',
    invoiceEnable: row.invoiceEnable === '是',
    statementEnable: row.statementEnable === '是',
    isDisabled: row.isDisabled === '禁用',
  }));
  
  emit('update:modelValue', updatedData as ClientContactAdminApi.ClientContactDto[]);
  emit('save');
};

// 行操作事件
const onAfterCreateRow = (index: number, amount: number) => {
  console.log(`Added ${amount} row(s) at index ${index}`);
};

const onAfterRemoveRow = (index: number, amount: number) => {
  console.log(`Removed ${amount} row(s) starting from index ${index}`);
  // 重新计算选中索引，确保删除行后状态正确
  nextTick(() => {
    const newSelectedIndexes: number[] = [];
    for (let i = 0; i < tableData.value.length; i++) {
      if (tableData.value[i]?.checkbox) {
        newSelectedIndexes.push(i);
      }
    }
    selectedRowIndexes.value = newSelectedIndexes;
  });
};

const onBeforeRemoveRow = (index: number, amount: number) => {
  console.log(`About to remove ${amount} row(s) starting from index ${index}`);
};

// 表格渲染完成后设置全选功能
const onAfterRender = () => {
  // 使用微任务确保在DOM更新后执行
  Promise.resolve().then(() => {
    const headerCheckbox = document.querySelector('#select-all-checkbox') as HTMLInputElement;
    if (headerCheckbox) {
      // 检查是否已经绑定过事件
      if (!(headerCheckbox as any).eventBound) {
        (headerCheckbox as any).eventBound = true;
        headerCheckbox.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const isChecked = (this as HTMLInputElement).checked;
          const hotInstance = hotTableRef.value?.hotInstance;
          if (hotInstance) {
            // 使用 Handsontable 的批量操作来更新复选框状态
            const changes: any[] = [];
            for (let i = 0; i < tableData.value.length; i++) {
              if (tableData.value[i].checkbox !== isChecked) {
                changes.push([i, 'checkbox', tableData.value[i].checkbox, isChecked]);
              }
            }
            
            if (changes.length > 0) {
              // 使用 batch 模式提高性能
              hotInstance.batch(() => {
                hotInstance.setDataAtRowProp(changes);
              });
            }
          }
        };
      }
      
      // 更新全选复选框状态 - 更完善的逻辑
      if (tableData.value.length > 0) {
        const checkedCount = tableData.value.filter(row => row.checkbox).length;
        const allChecked = checkedCount === tableData.value.length;
        const partialChecked = checkedCount > 0 && checkedCount < tableData.value.length;
        
        headerCheckbox.checked = allChecked;
        // 设置半选状态（如果浏览器支持）
        if (partialChecked) {
          headerCheckbox.indeterminate = true;
        } else {
          headerCheckbox.indeterminate = false;
        }
      } else {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
      }
    }
  });
};

// 行选择事件 - 当用户点击行时也选中复选框
const onAfterSelection = (row: number, col: number, row2: number, col2: number) => {
  // 如果点击的是复选框列（索引0），不需要额外处理
  if (col === 0 || col2 === 0) {
    return;
  }
  
  // 如果用户选择了单行，可以考虑自动选中该行的复选框
  // 这里暂时不实现，保持原有的复选框交互方式
};

defineExpose({
  addRow,
  saveData,
  deleteSelectedRows,
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

/* 确保复选框样式正确 */
.htCheckboxRendererInput {
  margin: 0;
  transform: scale(1.2);
}
</style>


