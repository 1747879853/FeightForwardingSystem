import { h } from 'vue';

/**
 * 多字段/集合派生文本不能交给 VXE formatter：它只按 column.field 缓存。
 * 保留原列键与排序配置，用函数插槽在每次渲染时读取当前行；导出也使用同一取值。
 * 单字段的普通格式化仍应直接绑定真实 field。
 */
export function rowTextColumn<Row = Record<string, any>>(
  text: (params: { row: Row }) => unknown,
) {
  const getText = (params: { row: Row }) => String(text(params) ?? '');
  return {
    slots: {
      default: (params: { row: Row }) => [h('span', getText(params))],
    },
    exportMethod: getText,
  };
}
