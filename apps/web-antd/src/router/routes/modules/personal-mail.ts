import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    name: 'PersonalMail',
    path: '/personal-mail',
    component: () => import('#/views/personal-mail/index.vue'),
    meta: {
      icon: 'lucide:mail',
      keepAlive: true,
      // 打开邮件会短暂带上 folder、uid，再清掉。按路径共用一个标签，避免查询串再开一页。
      fullPathKey: false,
      order: 2,
      title: $t('personal-mail.title'),
      authority: abpPageAuthority('Admin.PersonalMail'),
    },
  },
];

export default routes;
