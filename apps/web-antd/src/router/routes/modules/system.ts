import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';
import { abpPageAuthority } from '#/router/abp-authority';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ion:settings-outline',
      order: 9997,
      title: $t('system.title'),
      // 系统管理模块：拥有 Admin 或 Admin.Get 权限即可访问
      authority: abpPageAuthority('Admin'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        path: '/system/user',
        name: 'SystemUser',
        meta: {
          icon: 'mdi:account',
          title: $t('system.user.title'),
          // 用户管理：拥有 Admin.Team.User 或 Admin.Team.User.Get 权限
          authority: abpPageAuthority('Admin.Team.User'),
        },
        component: () => import('#/views/system/user/list.vue'),
      },
      {
        path: '/system/role',
        name: 'SystemRole',
        meta: {
          icon: 'mdi:account-group',
          title: $t('system.role.title'),
          // 角色管理：拥有 Admin.Team.Role 或 Admin.Team.Role.Get 权限
          authority: abpPageAuthority('Admin.Team.Role'),
        },
        component: () => import('#/views/system/role/list.vue'),
      },
      {
        path: '/system/permission',
        name: 'SystemPermission',
        meta: {
          icon: 'mdi:shield-key',
          title: $t('system.permission.title'),
          // 权限管理：拥有 Admin.Permission 或 Admin.Permission.Get 权限
          // TODO后台还没有分出来权限菜单，暂时用用户权限范围字段代替
          authority: abpPageAuthority('Admin.UserDataPermission'),
        },
        component: () => import('#/views/system/permission/list.vue'),
      },
      // {
      //   path: '/system/menu',
      //   name: 'SystemMenu',
      //   meta: {
      //     icon: 'mdi:menu',
      //     title: $t('system.menu.title'),
      //   },
      //   component: () => import('#/views/system/menu/list.vue'),
      // },
      {
        path: '/system/dept',
        name: 'SystemDept',
        meta: {
          icon: 'charm:organisation',
          title: $t('system.dept.title'),
          // 部门管理：拥有 Admin.Team.Organization 或 Admin.Team.Organization.Get 权限
          authority: abpPageAuthority('Admin.Team.Organization'),
        },
        component: () => import('#/views/system/dept/list.vue'),
      },
      {
        path: '/system/workflow',
        name: 'SystemWorkflow',
        meta: {
          icon: 'mdi:source-branch',
          title: $t('system.workflow.title'),
          authority: abpPageAuthority('Admin'),
        },
        component: () => import('#/views/system/workflow/list.vue'),
      },
      {
        path: '/system/workflow/create',
        name: 'SystemWorkflowCreate',
        meta: {
          icon: 'mdi:source-branch',
          title: $t('system.workflow.createTitle'),
          authority: abpPageAuthority('Admin'),
          hideInMenu: true,
          activePath: '/system/workflow',
        },
        component: () => import('#/views/system/workflow/form.vue'),
      },
      {
        path: '/system/workflow/edit/:id',
        name: 'SystemWorkflowEdit',
        meta: {
          icon: 'mdi:source-branch',
          title: $t('system.workflow.editTitle'),
          authority: abpPageAuthority('Admin'),
          hideInMenu: true,
          activePath: '/system/workflow',
        },
        component: () => import('#/views/system/workflow/form.vue'),
      },
      {
        path: '/system/enumeration',
        name: 'SystemEnumeration',
        meta: {
          icon: 'mdi:format-list-bulleted',
          title: $t('system.enumeration.title'),
          authority: abpPageAuthority('Admin'),
        },
        component: () => import('#/views/system/enumeration/list.vue'),
      },
      {
        path: '/system/cache',
        name: 'SystemCache',
        meta: {
          icon: 'mdi:database-outline',
          title: $t('system.cache.title'),
          authority: abpPageAuthority('Admin'),
        },
        component: () => import('#/views/system/cache/index.vue'),
      },
    ],
  },
];

export default routes;
