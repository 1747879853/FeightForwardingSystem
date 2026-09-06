<template>
  <div class="contact-handsontable-container">
    <div class="contact-toolbar">
      <div class="contact-toolbar__info">
        <span class="contact-toolbar__icon">
          <IconifyIcon icon="mdi:account-group-outline" />
        </span>
        <span class="contact-toolbar__title">联系人</span>
      </div>
      <div class="contact-toolbar__actions">
        <slot name="toolbar-tools" />
        <Button type="primary" @click="addRow">
          <IconifyIcon icon="ant-design:plus-outlined" class="size-4" />
          {{ $t('common.create') }}
        </Button>
        <Button type="primary" :loading="saving" @click="saveData">
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
import {
  ref,
  shallowRef,
  onMounted,
  onActivated,
  nextTick,
  watchEffect,
} from 'vue';
import { HotTable } from '@handsontable/vue3';
import { Button, Modal, message } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';
import { $t } from '#/locales';
import {
  setClientContactDisabled,
  deleteClientContact,
} from '#/api/sea-export/client-contact-admin';
import { userSimpleListCache } from '#/adapter/component/biz-select';

interface Props {
  clientId?: string;
  modelValue?: ClientContactAdminApi.ClientContactDto[];
}

interface Emits {
  (
    e: 'update:modelValue',
    value: ClientContactAdminApi.ClientContactDto[],
  ): void;
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

// ✅ 对接人（用户）下拉数据源：复用全量用户简易列表缓存（与 UserSelect 同源）。
// Handsontable 单元格展示昵称(userNickName)，提交用 userId，故维护 nickName↔userId 双向映射。
const userNameSource = ref<string[]>([]);
const nickNameToUserId = ref<Map<string, number>>(new Map());
const userIdToNickName = ref<Map<number, string>>(new Map());

/** 加载对接人候选（昵称去重），构建 nickName↔userId 映射 */
const loadUserOptions = async () => {
  try {
    const users = await userSimpleListCache.ensure();
    const names: string[] = [];
    const nameToId = new Map<string, number>();
    const idToName = new Map<number, string>();
    (users ?? []).forEach((user) => {
      const id = Number(user?.id);
      const nickName = (user?.nickName ?? '').trim();
      if (!nickName || Number.isNaN(id)) return;
      idToName.set(id, nickName);
      // 昵称重复时以首个为准，避免下拉出现同名歧义项
      if (!nameToId.has(nickName)) {
        nameToId.set(nickName, id);
        names.push(nickName);
      }
    });
    // 首项空字符串 = 不指定对接人（所有人可见）
    userNameSource.value = ['', ...names];
    nickNameToUserId.value = nameToId;
    userIdToNickName.value = idToName;
  } catch (error) {
    console.error('[ContactHandsontable] 加载对接人候选失败:', error);
  }
};

/** 由联系人取对接人展示昵称：优先 user.nickName，缺失时按 userId 反查缓存 */
const resolveUserNickName = (
  contact: ClientContactAdminApi.ClientContactDto,
): string => {
  const fromUser = (contact.user?.nickName ?? '').trim();
  if (fromUser) return fromUser;
  const uid = contact.userId;
  if (uid === null || uid === undefined || uid === 0) return '';
  return userIdToNickName.value.get(Number(uid)) ?? '';
};

// ✅ 联系人可选字段合法性校验规则（手机/邮箱/座机/QQ）：
// 四者均为可选字段——留空视为合法，一旦填写则必须符合对应格式
const CONTACT_FIELD_VALIDATORS = [
  {
    field: 'mobile',
    label: '手机',
    pattern: /^1[3-9]\d{9}$/,
    hint: '请输入 11 位有效手机号',
  },
  {
    field: 'email',
    label: '邮箱',
    pattern: /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/,
    hint: '请输入有效邮箱地址',
  },
  {
    field: 'landline',
    label: '座机',
    pattern: /^(?:0\d{2,3}-?)?\d{7,8}(?:-\d{1,5})?$/,
    hint: '请输入有效座机号（可含区号/分机）',
  },
  {
    field: 'qq',
    label: 'QQ',
    pattern: /^[1-9]\d{4,10}$/,
    hint: '请输入 5-11 位 QQ 号',
  },
];

// 校验单值：去除首尾空格后为空则合法（可选字段），否则按正则匹配
function validateContactField(pattern: RegExp, value: any): boolean {
  const text = value == null ? '' : String(value).trim();
  if (text === '') return true;
  return pattern.test(text);
}

// 生成 Handsontable 列 validator：非法时给单元格加 htInvalid（红框）做实时反馈
function makeContactValidator(field: string) {
  const rule = CONTACT_FIELD_VALIDATORS.find((item) => item.field === field);
  return (value: any, callback: (valid: boolean) => void) => {
    if (!rule) {
      callback(true);
      return;
    }
    callback(validateContactField(rule.pattern, value));
  };
}

// 遍历表格，返回首个非法字段的定位信息；全部合法返回 null（用于保存前拦截）
function findFirstInvalidContact(): {
  field: string;
  label: string;
  row: number;
  message: string;
} | null {
  for (let row = 0; row < tableData.value.length; row++) {
    const rowData = tableData.value[row];
    for (const rule of CONTACT_FIELD_VALIDATORS) {
      if (!validateContactField(rule.pattern, rowData?.[rule.field])) {
        return {
          field: rule.field,
          label: rule.label,
          row,
          message: `第 ${row + 1} 行【${rule.label}】${rule.hint}`,
        };
      }
    }
  }
  return null;
}

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
      renderer: function (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
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
      validator: makeContactValidator('mobile'),
    },
    {
      data: 'email',
      title: '邮箱',
      type: 'text',
      width: 180,
      validator: makeContactValidator('email'),
    },
    // ✅ 删除【办公电话】(tel) 列：与【座机】(landline) 重复，仅保留座机
    {
      data: 'landline',
      title: '座机',
      type: 'text',
      width: 120,
      validator: makeContactValidator('landline'),
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
      validator: makeContactValidator('qq'),
    },
    {
      data: 'isDefault',
      title: '默认',
      type: 'dropdown',
      source: ['是', '否'],
      width: 80,
      renderer: function (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
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
      renderer: function (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
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
      renderer: function (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        if (value === true || value === '是') {
          td.innerHTML = '是';
        } else {
          td.innerHTML = '否';
        }
        return td;
      },
    },
    {
      data: 'userNickName',
      title: '对接人',
      type: 'autocomplete',
      width: 120,
      // 空串 = 不指定对接人（所有人可见）；候选来自全量用户缓存，随输入过滤
      source: (query: string, process: (items: string[]) => void) => {
        const list = userNameSource.value;
        const keyword = (query ?? '').toString().trim().toLowerCase();
        const filtered = keyword
          ? list.filter(
              (name) => name !== '' && name.toLowerCase().includes(keyword),
            )
          : [...list];
        // 始终保留空选项，便于清空对接人
        if (!filtered.includes('')) filtered.unshift('');
        process(filtered);
      },
      strict: false,
      filteringCaseSensitive: false,
      trimDropdown: false,
      visibleRows: 10,
    },
    {
      data: 'remark',
      title: '备注',
      type: 'text',
      width: 150,
    },
    {
      data: 'creatorUserName',
      title: '创建人',
      type: 'text',
      width: 100,
      readOnly: true,
    },
    {
      data: 'lastModifierUserName',
      title: '修改人',
      type: 'text',
      width: 100,
      readOnly: true,
    },

    {
      title: '操作',
      type: 'text',
      width: 150,
      readOnly: true,
      renderer: function (
        instance: any,
        td: HTMLTableCellElement,
        row: number,
        col: number,
        prop: string,
        value: any,
        cellProperties: any,
      ) {
        // 清空内容
        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.whiteSpace = 'nowrap';

        // 创建操作按钮容器（视觉样式统一由 .contact-action-group 类控制）
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'contact-action-group';

        // 禁用/启用按钮
        const statusBtn = document.createElement('button');
        const rowData = instance.getSourceDataAtRow(row);
        const isDisabled =
          rowData?.isDisabled === true || rowData?.isDisabled === '禁用';

        statusBtn.textContent = isDisabled ? '启用' : '禁用';
        // 已禁用→按钮为「启用」(绿色系)；启用中→按钮为「禁用」(橙色系)
        statusBtn.className = isDisabled
          ? 'contact-action-btn contact-action-btn--enable'
          : 'contact-action-btn contact-action-btn--disable';

        statusBtn.onclick = async function (e) {
          e.preventDefault();
          e.stopPropagation();

          const rowData = instance.getSourceDataAtRow(row);
          const contactId = rowData.id;

          if (!contactId || contactId <= 0) {
            // 如果是新增但尚未保存的记录，仅更新本地状态
            const newData = [...tableData.value];
            newData[row].isDisabled = !isDisabled;
            tableData.value = newData;
            instance.setDataAtCell(
              row,
              instance.propToCol('isDisabled'),
              !isDisabled ? '禁用' : '启用',
            );
            return;
          }

          try {
            // 调用后端API禁用/启用联系人
            await setClientContactDisabled({
              id: contactId,
              isDisabled: !isDisabled,
            });

            // 更新本地数据
            const newData = [...tableData.value];
            newData[row].isDisabled = !isDisabled;
            tableData.value = newData;

            // 更新表格显示
            instance.setDataAtCell(
              row,
              instance.propToCol('isDisabled'),
              !isDisabled ? '禁用' : '启用',
            );

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
        deleteBtn.className = 'contact-action-btn contact-action-btn--delete';

        deleteBtn.onclick = function (e) {
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

  // 加载对接人下拉候选（用户昵称），供「对接人」列 autocomplete 使用
  void loadUserOptions();

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

// ✅ KeepAlive 重激活后修复 Handsontable 尺寸失效：
// 客户编辑页（ClientEdit 路由 keepAlive:true）外层 + 内部 <KeepAlive include="ClientContactList">
// 构成双层缓存。切到工作台时整页 DOM 被移入离屏容器、尺寸归零，Handsontable 表头克隆层
// (.ht_clone_top) 与单元格布局仍按旧（0）尺寸缓存；切回后不会自动重算，导致标题行/数据空白，
// 需点击页面触发 Handsontable 事件才重绘恢复。
// Vue 会把 onActivated 注入到所有祖先 KeepAlive 根，故两层缓存任一激活都会触发这里，
// 主动 refreshDimensions() + render() 按当前可见 DOM 重算并重绘。
onActivated(() => {
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (hotInstance) {
      hotInstance.refreshDimensions();
      hotInstance.render();
    }
  });
});

// 更新表格数据
const updateTableData = (
  contacts: ClientContactAdminApi.ClientContactDto[],
) => {
  console.log(
    '[Handsontable] updateTableData 被调用 - 数据量:',
    contacts.length,
  );

  const mappedData = contacts.map((contact) => ({
    ...contact,
    isDefault: contact.isDefault ? '是' : '否',
    invoiceEnable: contact.invoiceEnable ? '是' : '否',
    statementEnable: contact.statementEnable ? '是' : '否',
    isDisabled: contact.isDisabled ? '禁用' : '启用',
    // 对接人展示昵称（提交用的 userId 由 ...contact 透传保留）
    userNickName: resolveUserNickName(contact),
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
  console.log(
    '[Handsontable] watchEffect 触发 - modelValue 长度:',
    props.modelValue?.length,
  );
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
    // ✅ 对接人列编辑的是展示昵称(userNickName)，需同步回写提交用的 userId / user
    changes.forEach(([rowIdx, prop, , newValue]: any[]) => {
      if (prop !== 'userNickName') return;
      const target = tableData.value[rowIdx];
      if (!target) return;
      const nickName = (newValue ?? '').toString().trim();
      const matchedId = nickName
        ? (nickNameToUserId.value.get(nickName) ?? null)
        : null;
      target.userId = matchedId;
      target.user = matchedId ? { id: matchedId, nickName } : null;
    });

    const updatedData = tableData.value.map((row) => ({
      ...row,
      isDefault: row.isDefault === '是',
      invoiceEnable: row.invoiceEnable === '是',
      statementEnable: row.statementEnable === '是',
      isDisabled: row.isDisabled === '禁用',
    }));

    console.log('[Handsontable] 同步数据到父组件');
    emit(
      'update:modelValue',
      updatedData as ClientContactAdminApi.ClientContactDto[],
    );
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
    userId: null,
    userNickName: '',
    creatorUserName: '',
    lastModifierUserName: '',
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
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        //message.error(`删除失败: ${errorMessage}`);
      }
    },
  });
};

// 保存数据 - 只负责验证和通知父组件
const saveData = async () => {
  if (saving.value) return; // 防止重复提交

  // ✅ 保存前合法性校验：定位首个非法字段，提示 + 选中并滚动到该单元格，拦截保存
  const invalid = findFirstInvalidContact();
  if (invalid) {
    message.error(invalid.message);
    const hotInstance = hotTableRef.value?.hotInstance;
    if (hotInstance) {
      const col = hotInstance.propToCol(invalid.field);
      hotInstance.selectCell(invalid.row, col);
      hotInstance.scrollViewportTo(invalid.row, col);
    }
    return;
  }

  saving.value = true;

  try {
    const updatedData = tableData.value.map((row) => {
      // 对接人：以展示昵称回推 userId；空昵称 = 不指定（null）；
      // 昵称不在候选（如已停用用户）时保留行上原有 userId，避免误清空
      const nickName = (row.userNickName ?? '').toString().trim();
      const userId = nickName
        ? (nickNameToUserId.value.get(nickName) ?? row.userId ?? null)
        : null;
      return {
        ...row,
        isDefault: row.isDefault === '是',
        invoiceEnable: row.invoiceEnable === '是',
        statementEnable: row.statementEnable === '是',
        isDisabled: row.isDisabled === '禁用',
        userId,
      };
    });

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

<style scoped lang="scss">
.contact-handsontable-container {
  width: 100%;
}

/* 顶部工具栏 */
.contact-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.contact-toolbar__info {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.contact-toolbar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  font-size: 20px;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 10px;
}

.contact-toolbar__title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.contact-toolbar__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

/* 表格容器 */
.handsontable-wrapper {
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 5%);
}

/* Handsontable 表头主题化 */
.handsontable-wrapper :deep(.handsontable th) {
  font-weight: 600;
  color: hsl(var(--foreground));
  background: hsl(var(--accent));
  border-color: hsl(var(--border));
}

.handsontable-wrapper :deep(.handsontable td) {
  border-color: hsl(var(--border));
}

/* 操作列按钮（renderer 动态创建，无 scoped 属性，需 :deep 覆盖） */
.handsontable-wrapper :deep(.contact-action-group) {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.handsontable-wrapper :deep(.contact-action-btn) {
  padding: 3px 10px;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.handsontable-wrapper :deep(.contact-action-btn--enable) {
  color: #389e0d;
  background-color: #f6ffed;
  border-color: #b7eb8f;
}

.handsontable-wrapper :deep(.contact-action-btn--enable:hover) {
  background-color: #d9f7be;
  border-color: #95de64;
}

.handsontable-wrapper :deep(.contact-action-btn--disable) {
  color: #d46b08;
  background-color: #fff7e6;
  border-color: #ffd591;
}

.handsontable-wrapper :deep(.contact-action-btn--disable:hover) {
  background-color: #ffe7ba;
  border-color: #ffc069;
}

.handsontable-wrapper :deep(.contact-action-btn--delete) {
  color: #fff;
  background-color: #ff4d4f;
  border-color: #ff4d4f;
}

.handsontable-wrapper :deep(.contact-action-btn--delete:hover) {
  background-color: #ff7875;
  border-color: #ff7875;
}

/* ✅ 校验非法单元格：浅红底 + 红边框，配合 validator 实时反馈（覆盖 Handsontable 默认亮红） */
.handsontable-wrapper :deep(.htInvalid) {
  background-color: #fff1f0 !important;
  border-color: #ff4d4f !important;
}
</style>
