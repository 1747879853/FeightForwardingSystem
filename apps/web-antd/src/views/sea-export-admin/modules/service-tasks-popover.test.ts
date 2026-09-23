import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ServiceTasksPopover from './service-tasks-popover.vue';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  complete: vi.fn(),
  cancel: vi.fn(),
  fees: vi.fn(),
  success: vi.fn(),
  confirm: vi.fn(),
  access: vi.fn(() => true),
}));
vi.mock('@vben/access', () => ({
  useAccess: () => ({ hasAccessByCodes: mocks.access }),
}));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { userId: 12 } }),
}));
vi.mock('#/api/sea-export/sea-export-admin', () => ({
  getSeaExportServices: mocks.get,
}));
vi.mock('#/api/sea-export/se-service-task-admin', () => ({
  completeSeServiceTask: mocks.complete,
  cancelCompleteSeServiceTask: mocks.cancel,
}));
vi.mock('#/views/_shared/se-service-task/show-generated-fees', () => ({
  showGeneratedFeesIfAny: mocks.fees,
}));
vi.mock('ant-design-vue', () => ({
  Popover: {
    name: 'Popover',
    props: ['open'],
    emits: ['openChange'],
    template:
      '<div><slot /><section v-if="open"><slot name="content" /></section></div>',
  },
  Button: {
    props: ['disabled'],
    template: '<button :disabled="disabled"><slot /></button>',
  },
  Empty: { template: '<div>本票暂无服务项</div>' },
  Spin: { template: '<div><slot /></div>' },
  Tag: { template: '<span><slot /></span>' },
  message: { success: mocks.success },
  Modal: { confirm: mocks.confirm },
}));
const pending = [
  {
    id: 1,
    seaExportId: 'order',
    serviceType: 1,
    sortId: 10,
    seServiceTask: {
      id: 'task',
      serviceTaskStatus: 0,
      seServiceTaskUsers: [{ userId: 12, userNickName: '处理人' }],
    },
  },
];
const done = [
  {
    ...pending[0],
    seServiceTask: {
      id: 'task',
      serviceTaskStatus: 1,
      completionUserId: 12,
      completionUserNickName: '处理人',
    },
  },
];
let wrapper: ReturnType<typeof mount>;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockReturnValue(true);
  mocks.get.mockResolvedValue(pending);
  mocks.complete.mockResolvedValue({ generatedFeeCount: 1 });
  wrapper = mount(ServiceTasksPopover, {
    props: {
      seaExportId: 'order',
      labels: new Map([[1, '订舱']]),
      processes: new Map([[1, true]]),
    },
  });
});
afterEach(() => wrapper.unmount());
async function open() {
  wrapper.findComponent({ name: 'Popover' }).vm.$emit('openChange', true);
  await flushPromises();
}
describe('业务状态悬浮任务', () => {
  it('首次悬停才查询；完成后重查面板并向列表发出最新状态，展示自动费用', async () => {
    expect(mocks.get).not.toHaveBeenCalled();
    await open();
    expect(mocks.get).toHaveBeenCalledWith('order');
    expect(wrapper.text()).toContain('处理人');
    mocks.get.mockResolvedValue(done);
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(mocks.complete).toHaveBeenCalledWith({ id: 'task' });
    expect(wrapper.text()).toContain('已完成');
    expect(wrapper.emitted('refreshed')?.at(-1)).toEqual([done]);
    expect(mocks.fees).toHaveBeenCalledWith({ generatedFeeCount: 1 });
  });
  it('校验失败保持待处理，不提示成功或弹出费用', async () => {
    await open();
    mocks.complete.mockRejectedValue(new Error('必填附件未上传'));
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('待处理');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.fees).not.toHaveBeenCalled();
  });
  it('请求失败只显示重试入口，重试成功才允许操作', async () => {
    mocks.get.mockRejectedValueOnce(new Error('network'));
    await open();
    expect(wrapper.text()).toContain('加载失败');
    expect(wrapper.get('button').text()).toBe('重试');
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('button').text()).toBe('完成');
  });
  it('缺少功能权限不展示操作；取消完成须二次确认', async () => {
    mocks.access.mockReturnValue(false);
    await open();
    expect(wrapper.find('button').exists()).toBe(false);
    mocks.access.mockReturnValue(true);
    mocks.get.mockResolvedValue(done);
    await open();
    await wrapper.get('button').trigger('click');
    expect(mocks.cancel).not.toHaveBeenCalled();
    await mocks.confirm.mock.calls[0]![0].onOk();
    expect(mocks.cancel).toHaveBeenCalledWith({ id: 'task' });
  });
  it('切换记录后旧请求不能覆盖新记录状态', async () => {
    let resolve: (value: typeof pending) => void = () => {};
    mocks.get.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await open();
    await wrapper.setProps({ seaExportId: 'other' });
    resolve(pending);
    await flushPromises();
    expect(wrapper.emitted('refreshed')).toBeUndefined();
  });
});
