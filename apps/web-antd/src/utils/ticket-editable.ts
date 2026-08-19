/**
 * 海出 / 海进 / 空出票根 `isEditable`。
 * 缺字段或非 true 一律按不可编辑，避免老包或异常时误开写入口。
 */
export function isTicketEditable(
  record?: { isEditable?: boolean | null } | null,
): boolean {
  return record?.isEditable === true;
}

type FormApiLike = {
  setState: (state: { commonConfig?: { disabled?: boolean } }) => void;
};

/** 通过 VbenForm commonConfig.disabled 批量切换只读 */
export function setFormApisDisabled(apis: FormApiLike[], disabled: boolean) {
  for (const api of apis) {
    api.setState({ commonConfig: { disabled } });
  }
}
