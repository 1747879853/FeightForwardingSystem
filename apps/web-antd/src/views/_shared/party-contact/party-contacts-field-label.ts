import type { Ref, VNode } from 'vue';

import type { PartyContactDisplay } from './party-contact';

import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';

import { defineComponent, h, ref } from 'vue';

import { Checkbox, Popover, Spin } from 'ant-design-vue';

import {
  fetchClientContactOptions,
  toPartyContactDisplay,
} from './party-contact';

/**
 * 往来单位字段的标签：字段名在左，已选联系人姓名在右（多个用顿号连接）。
 * 能编辑时点姓名弹出该单位的联系人勾选列表（可多选）；不能编辑（票只读、往来单位被锁定）时悬停只看已选联系人。
 * 用正式组件挂 schema.label，避免 DOM 注入被动态表单 patch 清掉。
 * 不传 fieldLabel 时是紧凑形态「联系人 姓名」，给标签放不下姓名的横排表单单独摆在字段旁边。
 */
export function createPartyContactsFieldLabel(options: {
  componentName: string;
  /** 已选联系人，弹层里勾选/取消直接改它 */
  contacts: Ref<PartyContactDisplay[]>;
  /** 不能编辑时返回 true（票只读、往来单位被锁定），只能看不能改 */
  disabled?: () => boolean;
  /** 字段名，例如「委托单位」；不传为紧凑形态 */
  fieldLabel?: () => string;
  /** 当前往来单位 id，弹层列它名下未禁用的联系人 */
  parentId: () => unknown;
  /** 没选往来单位时弹层里的提示 */
  parentEmptyTip: string;
}) {
  return defineComponent({
    name: options.componentName,
    setup() {
      const loading = ref(false);
      const contactOptions = ref<ClientContactAdminApi.ClientContactDto[]>([]);
      let loadedParentKey: string | undefined;
      let loadSeq = 0;

      const getParentKey = () => {
        const id = options.parentId();
        return id === undefined || id === null || id === ''
          ? undefined
          : String(id);
      };

      /** 往来单位变了才重新拉联系人，同一单位只拉一次 */
      async function loadOptions() {
        const parentKey = getParentKey();
        if (parentKey === undefined) {
          contactOptions.value = [];
          loadedParentKey = undefined;
          return;
        }
        if (parentKey === loadedParentKey) return;
        const seq = ++loadSeq;
        loading.value = true;
        try {
          const items = await fetchClientContactOptions(parentKey);
          if (seq !== loadSeq) return;
          contactOptions.value = items;
          loadedParentKey = parentKey;
        } catch {
          if (seq !== loadSeq) return;
          contactOptions.value = [];
        } finally {
          if (seq === loadSeq) loading.value = false;
        }
      }

      function handleOpenChange(open: boolean) {
        if (open && !options.disabled?.()) void loadOptions();
      }

      function toggleContact(contact: PartyContactDisplay, checked: boolean) {
        const others = options.contacts.value.filter(
          (item) => String(item.id) !== String(contact.id),
        );
        options.contacts.value = checked ? [...others, contact] : others;
      }

      /** 弹层行：该单位未禁用的联系人，再补上已选但不在列表里的（已禁用等），保证能取消勾选 */
      function buildOptionRows(): PartyContactDisplay[] {
        if (getParentKey() !== loadedParentKey) return options.contacts.value;
        const rows = contactOptions.value.map((item) =>
          toPartyContactDisplay(item),
        );
        const rowIds = new Set(rows.map((item) => String(item.id)));
        options.contacts.value.forEach((item) => {
          if (!rowIds.has(String(item.id))) rows.push(item);
        });
        return rows;
      }

      function renderContactDetail(contact: PartyContactDisplay) {
        const parts = [
          ['手机', contact.mobile],
          ['邮箱', contact.email],
          ['电话', contact.tel],
        ].filter(([, value]) => !!value);
        if (parts.length === 0) return null;
        return h(
          'div',
          { class: 'break-all text-xs text-gray-500' },
          parts.map(([label, value]) => `${label} ${value}`).join(' · '),
        );
      }

      function renderReadonlyContent(): VNode {
        const selected = options.contacts.value;
        if (selected.length === 0) {
          return h('div', { class: 'text-xs text-gray-500' }, '未选择联系人');
        }
        return h(
          'div',
          { class: 'flex max-h-72 min-w-56 flex-col gap-2 overflow-auto' },
          selected.map((contact) =>
            h('div', { key: String(contact.id) }, [
              h('div', { class: 'text-xs text-gray-900' }, contact.name || '-'),
              renderContactDetail(contact),
            ]),
          ),
        );
      }

      function renderEditableContent(): VNode {
        if (getParentKey() === undefined) {
          return h(
            'div',
            { class: 'text-xs text-gray-500' },
            options.parentEmptyTip,
          );
        }
        const selectedIds = new Set(
          options.contacts.value.map((item) => String(item.id)),
        );
        const rows = buildOptionRows();
        return h(Spin, { size: 'small', spinning: loading.value }, () =>
          rows.length === 0 && !loading.value
            ? h('div', { class: 'text-xs text-gray-500' }, '该单位暂无联系人')
            : h(
                'div',
                {
                  class: 'flex max-h-72 min-w-56 flex-col gap-2 overflow-auto',
                },
                rows.map((contact) =>
                  h(
                    Checkbox,
                    {
                      key: String(contact.id),
                      checked: selectedIds.has(String(contact.id)),
                      'onUpdate:checked': (checked: boolean) =>
                        toggleContact(contact, checked),
                    },
                    () =>
                      h('span', { class: 'inline-flex flex-col' }, [
                        h(
                          'span',
                          { class: 'text-xs text-gray-900' },
                          contact.name || '-',
                        ),
                        renderContactDetail(contact),
                      ]),
                  ),
                ),
              ),
        );
      }

      return () => {
        const names = options.contacts.value
          .map((item) => item.name)
          .filter((name) => !!name)
          .join('、');
        const disabled = !!options.disabled?.();
        let triggerText = names || '-';
        if (!names && !disabled) triggerText = '选择联系人';
        const popover = h(
          Popover,
          {
            placement: 'topLeft',
            trigger: disabled ? 'hover' : 'click',
            onOpenChange: handleOpenChange,
          },
          {
            content: () =>
              disabled ? renderReadonlyContent() : renderEditableContent(),
            default: () =>
              h(
                'span',
                {
                  class: [
                    'max-w-32 truncate text-xs font-normal text-primary',
                    options.fieldLabel ? 'ml-auto pl-2' : '',
                    disabled ? 'cursor-help' : 'cursor-pointer',
                  ],
                  title: names || undefined,
                  onClick: (event: MouseEvent) => {
                    // 标签点击默认会聚焦往来单位下拉，这里只开联系人弹层
                    event.preventDefault();
                    event.stopPropagation();
                  },
                },
                triggerText,
              ),
          },
        );
        if (!options.fieldLabel) {
          return h(
            'span',
            { class: 'inline-flex min-w-0 items-center gap-1' },
            [
              h('span', { class: 'shrink-0 text-xs text-gray-500' }, '联系人'),
              popover,
            ],
          );
        }
        return h('span', { class: 'flex w-full min-w-0 items-center' }, [
          h('span', options.fieldLabel()),
          popover,
        ]);
      };
    },
  });
}
