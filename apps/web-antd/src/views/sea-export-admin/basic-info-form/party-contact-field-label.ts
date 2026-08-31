import type { Ref } from 'vue';

import { defineComponent, h } from 'vue';

import { Popover } from 'ant-design-vue';

import type { PartyContactDisplay } from './party-contact';

/**
 * 场站同款：字段名在左，联系人姓名在右，悬停看邮箱/手机/电话。
 * 用正式组件挂 schema.label，避免 DOM 注入被动态表单 patch 清掉。
 */
export function createPartyContactFieldLabel(options: {
  componentName: string;
  contact: Ref<PartyContactDisplay>;
  emailLabel: string;
  fieldLabel: () => string;
  mobileLabel: string;
  telLabel: string;
}) {
  return defineComponent({
    name: options.componentName,
    setup() {
      return () => {
        const contact = options.contact.value;
        const detailItems = [
          [options.emailLabel, contact.email],
          [options.mobileLabel, contact.mobile],
          [options.telLabel, contact.tel],
        ];
        return h('span', { class: 'flex w-full min-w-0 items-center' }, [
          h('span', options.fieldLabel()),
          h(
            Popover,
            { placement: 'topLeft', trigger: 'hover' },
            {
              content: () =>
                h(
                  'div',
                  { class: 'flex min-w-56 flex-col gap-2' },
                  detailItems.map(([label, value]) =>
                    h('div', { class: 'flex gap-3 text-xs', key: label }, [
                      h('span', { class: 'shrink-0 text-gray-500' }, label),
                      h(
                        'span',
                        {
                          class:
                            'min-w-0 flex-1 break-all text-right text-gray-900',
                        },
                        value || '-',
                      ),
                    ]),
                  ),
                ),
              default: () =>
                h(
                  'span',
                  {
                    class:
                      'ml-auto max-w-28 cursor-help truncate pl-2 text-xs font-normal text-primary',
                    onClick: (event: MouseEvent) => event.stopPropagation(),
                  },
                  contact.name || '-',
                ),
            },
          ),
        ]);
      };
    },
  });
}
