declare module 'vue-router' {
  interface RouteMeta {
    /**
     * 提成类型：0=销售提成 1=操作提成
     * 提成单列表页共用组件，靠该 meta 参数化
     */
    commissionType?: 0 | 1;
  }
}

export {};
