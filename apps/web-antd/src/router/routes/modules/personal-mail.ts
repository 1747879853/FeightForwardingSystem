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
      order: 2,
      title: $t('personal-mail.title'),
      authority: abpPageAuthority('Admin.PersonalMail'),
    },
  },
];

export default routes;
