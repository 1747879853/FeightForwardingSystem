<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.min.css';

// 示例数据
const tableData = ref([
  ['张三', 28, '北京', 8500, '2023-01-15'],
  ['李四', 35, '上海', 12000, '2022-08-20'],
  ['王五', 42, '广州', 15000, '2021-05-10'],
  ['赵六', 31, '深圳', 11000, '2023-03-25'],
  ['孙七', 26, '杭州', 9500, '2023-06-30'],
  ['周八', 38, '成都', 13500, '2022-11-15'],
  ['吴九', 29, '武汉', 8800, '2023-02-18'],
  ['郑十', 45, '南京', 16000, '2020-09-05'],
]);

// Handsontable 容器引用
const hotContainer = ref<HTMLElement | null>(null);
let hotInstance: Handsontable | null = null;

onMounted(() => {
  if (hotContainer.value) {
    // ✅ 创建 Handsontable 实例，启用列排序功能
    hotInstance = new Handsontable(hotContainer.value, {
      data: tableData.value,

      // ✅ 核心配置：启用列排序
      columnSorting: {
        indicator: true, // 显示排序指示器（箭头图标）
        sortEmptyCells: false, // 不排序空单元格
        initialConfig: {
          // 初始排序配置（可选）
          column: 0,
          sortOrder: 'asc',
        },
      },

      // ✅ 允许手动拖拽移动列
      manualColumnMove: true,

      // 列头配置
      colHeaders: ['姓名', '年龄', '城市', '薪资', '入职日期'],

      // 行头配置
      rowHeaders: true,

      // 列配置（可选，用于自定义每列的行为）
      columns: [
        { type: 'text' }, // 姓名列：文本类型
        { type: 'numeric' }, // 年龄列：数字类型
        { type: 'text' }, // 城市列：文本类型
        { type: 'numeric' }, // 薪资本：数字类型
        { type: 'date', dateFormat: 'YYYY-MM-DD' }, // 日期列
      ],

      // 其他常用配置
      width: '100%',
      height: 400,
      stretchH: 'all', // 自动拉伸列以填满容器
      manualColumnResize: true, // 允许手动调整列宽

      // 监听排序事件
      afterColumnSort: (
        currentSortConfig: any,
        destinationSortConfigs: any,
      ) => {
        console.log('排序完成:', destinationSortConfigs);
      },

      // 授权密钥
      licenseKey: 'non-commercial-and-evaluation',
    });

    console.log('Handsontable 实例已创建，列排序功能已启用！');
  }
});

// 获取当前排序配置
function getSortConfig() {
  if (hotInstance) {
    const sortConfig = hotInstance.getSortConfig();
    console.log('当前排序配置:', sortConfig);
    alert('当前排序配置:\n' + JSON.stringify(sortConfig, null, 2));
  }
}

// 清除排序
function clearSorting() {
  if (hotInstance) {
    hotInstance.clearSorting();
    console.log('已清除排序');
  }
}

// 按指定列排序
function sortByColumn(columnIndex: number, order: 'asc' | 'desc') {
  if (hotInstance) {
    hotInstance.sort(columnIndex, order);
    console.log(
      `已按第 ${columnIndex + 1} 列${order === 'asc' ? '升序' : '降序'}排序`,
    );
  }
}
</script>

<template>
  <div class="handsontable-sorting-demo">
    <h1>📊 Handsontable 列排序功能演示</h1>

    <div class="info-box">
      <p><strong>功能说明：</strong></p>
      <p>✅ 点击列头可进行升序/降序排序</p>
      <p>✅ 拖拽列头可以手动移动列位置</p>
      <p>✅ 支持多列排序（按住 Ctrl 键点击多个列头）</p>
      <p>✅ 排序状态会在列头上显示箭头图标</p>
    </div>

    <div class="button-group">
      <a-button @click="getSortConfig">获取当前排序配置</a-button>
      <a-button @click="clearSorting">清除排序</a-button>
      <a-button @click="sortByColumn(0, 'asc')">按第一列升序</a-button>
      <a-button @click="sortByColumn(1, 'desc')">按第二列降序</a-button>
    </div>

    <!-- Handsontable 容器 -->
    <div ref="hotContainer" class="hot-container"></div>
  </div>
</template>

<style scoped>
.handsontable-sorting-demo {
  padding: 20px;
  background: white;
  border-radius: 8px;
}

h1 {
  margin-bottom: 20px;
  color: #333;
}

.info-box {
  padding: 12px;
  margin-bottom: 20px;
  background: #e6f7ff;
  border-left: 4px solid #1890ff;
  border-radius: 4px;
}

.info-box p {
  margin: 5px 0;
  color: #555;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.hot-container {
  margin-top: 20px;
}
</style>
