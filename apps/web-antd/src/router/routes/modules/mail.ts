import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

/**
 * 邮件：个人邮件、邮件模板、发送记录。
 * 发送记录登录即可看，父级不挂权限，避免没配邮箱或模板权限的人看不到这一组。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'Mail',
    path: '/mail',
    meta: {
      icon: 'lucide:mail',
      order: 2,
      title: '邮件',
      hideChildrenInMenu: false,
    },
    children: [
      {
        name: 'PersonalMail',
        path: '/personal-mail',
        component: () => import('#/views/personal-mail/index.vue'),
        meta: {
          icon: 'lucide:inbox',
          keepAlive: true,
          // 打开邮件会短暂带上 folder、uid，再清掉。按路径共用一个标签，避免查询串再开一页。
          fullPathKey: false,
          order: 1,
          title: $t('personal-mail.title'),
          authority: abpPageAuthority('Admin.PersonalMail'),
        },
      },
      {
        name: 'MailTemplate',
        path: '/mail-templates',
        component: () => import('#/views/mail-template/list.vue'),
        meta: {
          icon: 'lucide:mails',
          keepAlive: true,
          order: 2,
          title: '邮件模板',
          authority: abpPageAuthority('Admin.MailTemplate'),
        },
      },
      {
        name: 'MailSendRecord',
        path: '/mail-send-records',
        component: () => import('#/views/mail-template/send-record-list.vue'),
        meta: {
          icon: 'lucide:send',
          keepAlive: true,
          order: 3,
          title: '发送记录',
        },
      },
    ],
  },
];

export default routes;
