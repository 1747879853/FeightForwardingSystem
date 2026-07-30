<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { message, Checkbox,Button } from 'ant-design-vue';

interface ColumnConfig {
  data: string;
  title: string;
  visible: boolean;
  fixed?: 'left' | 'right' | false;
  order: number;
}

const props = defineProps<{
  modelValue: boolean;
  columns: ColumnConfig[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', columns: ColumnConfig[]): void;
}>();

// 本地模态框状态
const modalOpen = ref(props.modelValue);

// 监听外部modelValue变化
watch(
  () => props.modelValue,
  (newVal) => {
    modalOpen.value = newVal;
  }
);

// 监听本地状态变化并同步到父组件
watch(
  modalOpen,
  (newVal) => {
    if (newVal !== props.modelValue) {
      emit('update:modelValue', newVal);
    }
  }
);

// 本地列配置副本，用于编辑
const localColumns = ref<ColumnConfig[]>([]);

// 初始化本地列配置
watch(
  () => props.columns,
  (newColumns) => {
    if (newColumns && newColumns.length > 0) {
      // 创建深拷贝，避免直接修改props
      localColumns.value = newColumns.map(col => ({
        ...col,
        // 确保order字段存在
        order: col.order ?? 999,
        // 确保visible字段存在，默认为true
        visible: col.visible ?? true,
        // 确保fixed字段存在，默认为false
        fixed: col.fixed ?? false
      })).sort((a, b) => a.order - b.order);
    }
  },
  { immediate: true }
);

// 所有列（包括隐藏列）
const allColumns = computed(() => {
  return localColumns.value;
});

// 固定左侧列（包括隐藏列）
const leftFixedColumnsAll = computed(() => {
  return allColumns.value.filter(col => col.fixed === 'left');
});

// 固定右侧列（包括隐藏列）
const rightFixedColumnsAll = computed(() => {
  return allColumns.value.filter(col => col.fixed === 'right');
});

// 非固定列（包括隐藏列）
const nonFixedColumnsAll = computed(() => {
  return allColumns.value.filter(col => col.fixed === false);
});

// 切换列可见性
const toggleColumnVisibility = (data: string, checked: boolean) => {
  const column = localColumns.value.find(col => col.data === data);
  if (column) {
    column.visible = checked;
  }
};

// 设置列固定位置
const setColumnFixed = (data: string, position: 'left' | 'right' | false) => {
  const column = localColumns.value.find(col => col.data === data);
  if (column) {
    column.fixed = position;
  }
};

// 取消列固定
const unsetColumnFixed = (data: string) => {
  const column = localColumns.value.find(col => col.data === data);
  if (column) {
    column.fixed = false;
  }
};

// 上移列位置
const moveColumnUp = (section: 'left' | 'normal' | 'right', index: number) => {
  let sectionColumns: ColumnConfig[] = [];
  
  if (section === 'left') {
    sectionColumns = leftFixedColumnsAll.value;
  } else if (section === 'normal') {
    sectionColumns = nonFixedColumnsAll.value;
  } else {
    sectionColumns = rightFixedColumnsAll.value;
  }
  
  if (index <= 0 || index >= sectionColumns.length) return;
  
  const currentColumn = sectionColumns[index];
  const prevColumn = sectionColumns[index - 1];
  
  if (!currentColumn || !prevColumn) return;
  
  // 交换order值
  const tempOrder = currentColumn.order;
  currentColumn.order = prevColumn.order;
  prevColumn.order = tempOrder;
  
  // 重新排序本地列
  localColumns.value.sort((a, b) => a.order - b.order);
};

// 下移列位置
const moveColumnDown = (section: 'left' | 'normal' | 'right', index: number) => {
  let sectionColumns: ColumnConfig[] = [];
  
  if (section === 'left') {
    sectionColumns = leftFixedColumnsAll.value;
  } else if (section === 'normal') {
    sectionColumns = nonFixedColumnsAll.value;
  } else {
    sectionColumns = rightFixedColumnsAll.value;
  }
  
  if (index < 0 || index >= sectionColumns.length - 1) return;
  
  const currentColumn = sectionColumns[index];
  const nextColumn = sectionColumns[index + 1];
  
  if (!currentColumn || !nextColumn) return;
  
  // 交换order值
  const tempOrder = currentColumn.order;
  currentColumn.order = nextColumn.order;
  nextColumn.order = tempOrder;
  
  // 重新排序本地列
  localColumns.value.sort((a, b) => a.order - b.order);
};

// 获取固定图标的颜色
const getPinColor = (fixed: 'left' | 'right' | false | undefined) => {
  if (fixed === 'left') {
    return '#1890ff'; // 蓝色表示左侧固定
  } else if (fixed === 'right') {
    return '#52c41a'; // 绿色表示右侧固定
  } else {
    return '#bfbfbf'; // 灰色表示未固定
  }
};

// 保存配置
const handleSave = () => {
  // 验证是否有可见列
  const visibleCount = localColumns.value.filter(col => col.visible).length;
  if (visibleCount === 0) {
    message.warning('至少需要保留一列可见');
    return;
  }
  
  emit('save', [...localColumns.value]);
  handleClose();
};

// 重置配置
const handleReset = () => {
  // 重置为原始配置
  if (props.columns && props.columns.length > 0) {
    localColumns.value = props.columns.map(col => ({
      ...col,
      order: col.order ?? 999,
      visible: col.visible ?? true,
      fixed: col.fixed ?? false
    })).sort((a, b) => a.order - b.order);
  }
};

// 关闭弹窗
const handleClose = () => {
  emit('update:modelValue', false);
};
</script>

<template>
  <div 
    v-if="modelValue"
    class="column-config-dropdown"
  >
    <div class="config-header">
      <span class="header-title">表格列配置</span>
    </div>
    
    <div class="columns-list">
      <!-- 固定左侧列（包括隐藏列） -->
      <div v-if="leftFixedColumnsAll.length > 0" class="fixed-section">
        <div class="section-title">固定在左侧</div>
        <div 
          v-for="(column, index) in leftFixedColumnsAll" 
          :key="column.data"
          class="column-item"
        >
          <Checkbox 
            :checked="column.visible"
            @change="(e: any) => toggleColumnVisibility(column.data, e.target.checked)"
          >
            <span class="column-name">{{ column.title }}</span>
          </Checkbox>
          <div class="column-actions">
            <div class="pin-buttons">
              <span 
                class="pin-icon active"
                :style="{ color: getPinColor(column.fixed) }"
                @click="setColumnFixed(column.data, 'left')"
                title="固定在左侧"
              >
                <!-- 左固定图标 - 向左箭头 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </span>
              <span 
                class="pin-icon active"
                :style="{ color: getPinColor(column.fixed) }"
                @click="unsetColumnFixed(column.data)"
                title="取消固定"
              >
                <!-- 取消固定图标 - 图钉带斜线 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                </svg>
              </span>
              <span 
                class="pin-icon"
                :style="{ color: getPinColor(column.fixed) }"
                @click="setColumnFixed(column.data, 'right')"
                title="固定在右侧"
              >
                <!-- 右固定图标 - 向右箭头 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </span>
            </div>
            <div class="move-buttons">
              <Button 
                size="small" 
                type="link" 
                :disabled="index === 0"
                @click="moveColumnUp('left', index)"
              >
                ↑
              </Button>
              <Button 
                size="small" 
                type="link" 
                :disabled="index === leftFixedColumnsAll.length - 1"
                @click="moveColumnDown('left', index)"
              >
                ↓
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 非固定列（包括隐藏列） -->
      <div v-if="nonFixedColumnsAll.length > 0" class="normal-section">
        <div class="section-title">普通列</div>
        <div 
          v-for="(column, index) in nonFixedColumnsAll" 
          :key="column.data"
          class="column-item"
        >
          <Checkbox 
            :checked="column.visible"
            @change="(e: any) => toggleColumnVisibility(column.data, e.target.checked)"
          >
            <span class="column-name">{{ column.title }}</span>
          </Checkbox>
          <div class="column-actions">
            <div class="pin-buttons">
              <span 
                class="pin-icon"
                :style="{ color: getPinColor(column.fixed) }"
                @click="setColumnFixed(column.data, 'left')"
                title="固定在左侧"
              >
                <!-- 左固定图标 - 向左箭头 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </span>
              <span 
                class="pin-icon active"
                :style="{ color: getPinColor(column.fixed) }"
                @click="unsetColumnFixed(column.data)"
                title="取消固定"
              >
                <!-- 取消固定图标 - 图钉带斜线 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                </svg>
              </span>
              <span 
                class="pin-icon"
                :style="{ color: getPinColor(column.fixed) }"
                @click="setColumnFixed(column.data, 'right')"
                title="固定在右侧"
              >
                <!-- 右固定图标 - 向右箭头 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </span>
            </div>
            <div class="move-buttons">
              <Button 
                size="small" 
                type="link" 
                :disabled="index === 0"
                @click="moveColumnUp('normal', index)"
              >
                ↑
              </Button>
              <Button 
                size="small" 
                type="link" 
                :disabled="index === nonFixedColumnsAll.length - 1"
                @click="moveColumnDown('normal', index)"
              >
                ↓
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 固定右侧列（包括隐藏列） -->
      <div v-if="rightFixedColumnsAll.length > 0" class="fixed-section">
        <div class="section-title">固定在右侧</div>
        <div 
          v-for="(column, index) in rightFixedColumnsAll" 
          :key="column.data"
          class="column-item"
        >
          <Checkbox 
            :checked="column.visible"
            @change="(e: any) => toggleColumnVisibility(column.data, e.target.checked)"
          >
            <span class="column-name">{{ column.title }}</span>
          </Checkbox>
          <div class="column-actions">
            <div class="pin-buttons">
              <span 
                class="pin-icon"
                :style="{ color: getPinColor(column.fixed) }"
                @click="setColumnFixed(column.data, 'left')"
                title="固定在左侧"
              >
                <!-- 左固定图标 - 向左箭头 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </span>
              <span 
                class="pin-icon active"
                :style="{ color: getPinColor(column.fixed) }"
                @click="unsetColumnFixed(column.data)"
                title="取消固定"
              >
                <!-- 取消固定图标 - 图钉带斜线 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
                </svg>
              </span>
              <span 
                class="pin-icon active"
                :style="{ color: getPinColor(column.fixed) }"
                @click="setColumnFixed(column.data, 'right')"
                title="固定在右侧"
              >
                <!-- 右固定图标 - 向右箭头 -->
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </span>
            </div>
            <div class="move-buttons">
              <Button 
                size="small" 
                type="link" 
                :disabled="index === 0"
                @click="moveColumnUp('right', index)"
              >
                ↑
              </Button>
              <Button 
                size="small" 
                type="link" 
                :disabled="index === rightFixedColumnsAll.length - 1"
                @click="moveColumnDown('right', index)"
              >
                ↓
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="config-footer">
      <div class="footer-actions">
        <Button size="small" type="default" @click="handleReset" class="reset-btn">
          重置
        </Button>
        <div class="footer-buttons">
          <Button size="small" @click="handleClose" class="cancel-btn mr-2">
            取消
          </Button>
          <Button size="small" type="primary" @click="handleSave" class="save-btn">
            确定
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.column-config-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  width: 270px;
  max-height: 500px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  
  .config-header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 12px 16px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #e8e8e8;
    border-radius: 4px 4px 0 0;
    
    .header-title {
      font-weight: bold;
      color: #333;
      font-size: 14px;
    }
  }
  
  .columns-list {
    padding: 12px 0;
    max-height: 380px;
    overflow-y: auto;
  }
  
  .section-title {
    font-weight: bold;
    margin: 12px 16px 8px 16px;
    color: #666;
    padding-left: 8px;
    border-left: 3px solid #1890ff;
    font-size: 12px;
  }
  
  .column-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .ant-checkbox-wrapper {
      flex: 1;
      overflow: hidden;
    }
    
    .column-name {
      font-size: 12px;
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: inline-block;
      max-width: 120px;
      vertical-align: middle;
    }
    
    .column-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-shrink: 0;
      
      .pin-buttons {
        display: flex;
        gap: 4px;
        
        .pin-icon {
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          
          &.active {
            opacity: 1;
          }
          
          &:hover {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
      }
      
      .move-buttons {
        display: flex;
        gap: 4px;
      }
    }
  }
  
  .config-footer {
    padding: 12px 16px;
    border-top: 1px solid #e8e8e8;
    
    .footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
    }
  }
}
</style>
