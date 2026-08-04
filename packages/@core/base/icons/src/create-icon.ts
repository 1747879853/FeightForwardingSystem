import { defineComponent, h } from 'vue';

import { Icon } from '@iconify/vue';

function createIconifyIcon(
  icon: string,
  iconProps: Record<string, unknown> = {},
) {
  return defineComponent({
    name: `Icon-${icon}${iconProps.hFlip ? '-hFlip' : ''}${iconProps.vFlip ? '-vFlip' : ''}`,
    setup(props, { attrs }) {
      return () => h(Icon, { ...iconProps, icon, ...props, ...attrs });
    },
  });
}

export { createIconifyIcon };
