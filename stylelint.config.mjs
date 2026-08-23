export default {
  extends: ['@vben/stylelint-config'],
  overrides: [
    {
      // 小程序用 rpx 单位与 page/view/text 等内置标签，标准规则会整片误报
      files: ['apps/mp/**/*.vue', 'apps/mp/**/*.scss', 'apps/mp/**/*.css'],
      rules: {
        // inset 简写在旧版小程序 webview 上不生效，遮罩会塌成 0 尺寸
        'declaration-block-no-redundant-longhand-properties': null,
        'declaration-property-value-no-unknown': null,
        'selector-type-no-unknown': [
          true,
          {
            ignore: ['custom-elements'],
            ignoreTypes: ['page', 'view', 'text', 'image'],
          },
        ],
      },
    },
  ],
  root: true,
};
