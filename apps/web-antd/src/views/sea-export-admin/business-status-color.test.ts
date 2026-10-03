import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { describe, expect, it } from 'vitest';

import {
  getSeaExportBusinessStatusMeta,
  resolveSeaExportBusinessStatusView,
  SEA_EXPORT_BUSINESS_STATUS_COLORS,
} from './data';

function service(
  serviceType: number,
  sortId: number,
  status?: 0 | 1,
): SeaExportAdminApi.SeaExportServiceDto {
  return {
    id: serviceType * 100 + sortId,
    seaExportId: 'order',
    serviceType,
    sortId,
    seServiceTask:
      status === undefined
        ? null
        : {
            id: `task-${serviceType}`,
            serviceTaskStatus: status,
          },
  };
}

describe('列表业务状态配置色', () => {
  const labels = new Map([
    [1, '订舱'],
    [2, '拖车'],
  ]);
  const colors = new Map([[1, '#1677ff']]);

  it('进行中保留三态底色，待和服务名用配置色', () => {
    const meta = getSeaExportBusinessStatusMeta(
      {
        seaExportServices: [service(1, 10, 0), service(2, 20, 0)],
      } as SeaExportAdminApi.SeaExportDto,
      labels,
    );
    expect(meta).toMatchObject({
      text: '订舱',
      state: 'active',
      serviceTypes: [1],
    });
    const view = resolveSeaExportBusinessStatusView(meta, colors);
    expect(view.colors.background).toBe(
      SEA_EXPORT_BUSINESS_STATUS_COLORS.active.background,
    );
    expect(view.colors.color).toBe('#1677ff');
    expect(view.pendingColor).toBe('#1677ff');
  });

  it('没配颜色或已完成时回退三态色', () => {
    const active = getSeaExportBusinessStatusMeta({
      seaExportServices: [service(2, 10, 0)],
    } as SeaExportAdminApi.SeaExportDto);
    const activeView = resolveSeaExportBusinessStatusView(active, colors);
    expect(activeView.colors).toEqual(SEA_EXPORT_BUSINESS_STATUS_COLORS.active);
    expect(activeView.pendingColor).toBeUndefined();

    const done = getSeaExportBusinessStatusMeta({
      seaExportServices: [service(1, 10, 1)],
    } as SeaExportAdminApi.SeaExportDto);
    expect(done.state).toBe('done');
    const doneView = resolveSeaExportBusinessStatusView(done, colors);
    expect(doneView.colors).toEqual(SEA_EXPORT_BUSINESS_STATUS_COLORS.done);
    expect(doneView.pendingColor).toBeUndefined();
  });
});
