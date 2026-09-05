declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

// Handsontable Vue3 组件类型声明
declare module '@handsontable/vue3' {
  import { DefineComponent } from 'vue';

  export interface HotTableProps {
    settings?: any;
    [key: string]: any;
  }

  export const HotTable: DefineComponent<HotTableProps>;
  export default HotTable;
}

declare module '@vue-office/docx' {
  import type { Component } from 'vue';
  const component: Component;
  export default component;
}

declare module '@vue-office/excel' {
  import type { Component } from 'vue';
  const component: Component;
  export default component;
}

declare module '@vue-office/pptx' {
  import type { Component } from 'vue';
  const component: Component;
  export default component;
}
