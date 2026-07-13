/**
 * 列表分组统计 - 通用类型
 *
 * 设计目标：海运出口先接入，后续其他列表模块（空运、海运进口等）可复用同一套
 * composable 与组件，仅需各自提供「分组字段定义 + 分组数据请求函数」。
 */

/** 分组字段定义 */
export interface GroupFieldDef<TField extends number = number> {
  /** 分组字段值（对应后端 GroupField 枚举值） */
  value: TField;
  /** 分组设置弹层中显示的名称 */
  label: string;
  /**
   * 点击分组项后追加到「列表查询」的参数名。
   * 例如起运港分组追加 `POLId`、装运方式分组追加 `BLType`。
   */
  paramKey: string;
  /**
   * 可空字段「未填写」分组项（id/name 均为 null）对应的列表查询参数名。
   * 点击该分组项时追加 `{ [emptyParamKey]: true }`（如起运港追加 `POLIdEmpty: true`）。
   * 仅可空字段需要配置；非可空字段不配置时，未填写分组项不会追加筛选。
   */
  emptyParamKey?: string;
  /**
   * 与该分组互斥的「搜索表单」字段名（启用分组后会被禁用并清空）。
   * 不传则默认取 `paramKey`；若搜索表单中不存在该字段则忽略。
   */
  searchField?: string;
}

/** 单个分组项（后端返回的分组统计结果） */
export interface GroupItem {
  /** 分组值 id（无值为 null） */
  id: null | number | string;
  /** 分组名称（无值为 null） */
  name: null | string;
  /** 该分组数据总条数 */
  count: number;
  /**
   * 分组项 logo 展示地址（已解析为可直接访问的完整地址）。
   * 由调用方在 `fetchGroups` 中按需注入（如船公司分组展示船司 logo）；
   * 无值时分组项不展示 logo。
   */
  logoUrl?: string;
}
