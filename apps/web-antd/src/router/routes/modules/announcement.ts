import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'streamline-plump-color:announcement-megaphone-flat',
      order: 9998,
      title: $t('system.announcement.title'),
      hideChildrenInMenu: true,
      authority: abpPageAuthority('Admin.Announcement'),
    },
    name: 'Announcement',
    path: '/system/announcement',
    children: [
      {
        path: '',
        name: 'SystemAnnouncement',
        meta: {
          icon: 'mdi:bullhorn-outline',
          keepAlive: true,
          title: $t('system.announcement.title'),
          authority: abpPageAuthority('Admin.Announcement'),
          hideInMenu: true,
        },
        component: () => import('#/views/system/announcement/list.vue'),
      },
    ],
  },
];

export default routes;
