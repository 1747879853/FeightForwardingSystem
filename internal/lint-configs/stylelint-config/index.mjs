// Vue scoped 深度选择器（含通过 `<style src>` 外链的组件样式）在 SFC 编译期会被转换，
// 但独立的 .css/.scss 文件按普通样式解析，需显式放宽这些伪类/伪元素避免误报。
const vueScopedSelectorRules = {
  'selector-pseudo-class-no-unknown': [
    true,
    {
      ignorePseudoClasses: ['global', 'deep'],
    },
  ],
  'selector-pseudo-element-no-unknown': [
    true,
    {
      ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'],
    },
  ],
};

export default {
  extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
  ignoreFiles: [
    '**/*.js',
    '**/*.jsx',
    '**/*.tsx',
    '**/*.ts',
    '**/*.json',
    '**/*.md',
  ],
  overrides: [
    {
      customSyntax: 'postcss-html',
      files: ['*.(html|vue)', '**/*.(html|vue)'],
      rules: {
        ...vueScopedSelectorRules,
      },
    },
    {
      files: ['*.css', '**/*.css'],
      rules: {
        ...vueScopedSelectorRules,
      },
    },
    {
      customSyntax: 'postcss-scss',
      extends: [
        'stylelint-config-recommended-scss',
        'stylelint-config-recommended-vue/scss',
      ],
      files: ['*.scss', '**/*.scss'],
      rules: {
        ...vueScopedSelectorRules,
      },
    },
  ],
  plugins: [
    'stylelint-order',
    '@stylistic/stylelint-plugin',
    'stylelint-prettier',
    'stylelint-scss',
  ],
  rules: {
    'at-rule-no-deprecated': null,
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'extends',
          'ignores',
          'include',
          'mixin',
          'if',
          'else',
          'media',
          'for',
          'at-root',
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'function',
          'each',
          'use',
          'forward',
          'return',
        ],
      },
    ],
    'font-family-no-missing-generic-family-keyword': null,
    'function-no-unknown': null,
    'import-notation': null,
    'media-feature-range-notation': null,
    'named-grid-areas-no-invalid': null,
    'no-descending-specificity': null,
    'no-empty-source': null,
    'order/order': [
      [
        'dollar-variables',
        'custom-properties',
        'at-rules',
        'declarations',
        {
          name: 'supports',
          type: 'at-rule',
        },
        {
          name: 'media',
          type: 'at-rule',
        },
        {
          name: 'include',
          type: 'at-rule',
        },
        'rules',
      ],
      { severity: 'error' },
    ],
    'prettier/prettier': true,
    'rule-empty-line-before': [
      'always',
      {
        ignore: ['after-comment', 'first-nested'],
      },
    ],
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'extends',
          'ignores',
          'include',
          'mixin',
          'if',
          'else',
          'media',
          'for',
          'at-root',
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'function',
          'each',
          'use',
          'forward',
          'return',
        ],
      },
    ],
    'scss/operator-no-newline-after': null,
    'selector-class-pattern':
    null,

    'selector-not-notation': null,
  },
};
