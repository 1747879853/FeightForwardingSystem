import { h } from 'vue';

import { message, Modal, Textarea } from 'ant-design-vue';

import { $t } from '#/locales';

export type OpenAuditRemarkConfirmOptions = {
  title: string;
  /** 危险操作（驳回等）时 OK 按钮标红 */
  danger?: boolean;
  /** 备注是否必填 */
  remarkRequired?: boolean;
  remarkRequiredMessage?: string;
  maxlength?: number;
  placeholder?: string;
  onConfirm: (remark: string) => void | Promise<void>;
};

/**
 * 审核通过/驳回通用「备注 + 确认」弹窗。
 * 调用方自行完成选中行校验；本函数只负责收集备注并回调。
 */
export function openAuditRemarkConfirm(options: OpenAuditRemarkConfirmOptions) {
  let modalRemark = '';
  Modal.confirm({
    title: options.title,
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: { target?: { value?: string } } | string) => {
            modalRemark =
              typeof val === 'string' ? val : (val.target?.value ?? '');
          },
          rows: 3,
          placeholder:
            options.placeholder ?? $t('auditApproval.task.remarkPlaceholder'),
          maxlength: options.maxlength ?? 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okButtonProps: options.danger ? { danger: true } : undefined,
    async onOk() {
      const remark = modalRemark.trim();
      if (options.remarkRequired && !remark) {
        const msg =
          options.remarkRequiredMessage ??
          $t('auditApproval.task.remarkPlaceholder');
        message.warning(msg);
        return Promise.reject(new Error('remark required'));
      }
      await options.onConfirm(remark);
    },
  });
}
