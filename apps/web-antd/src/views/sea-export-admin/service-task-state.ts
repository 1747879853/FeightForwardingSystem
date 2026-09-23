import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

type Service = SeaExportAdminApi.SeaExportServiceDto;

/** 同优先级并行；整组完成后才能进入下一组。未生成任务也属于未完成。 */
export function getActiveServiceSortId(services: Service[]) {
  const pending = services.filter(
    (item) => item.seServiceTask?.serviceTaskStatus !== 1,
  );
  return pending.length
    ? Math.min(...pending.map((item) => item.sortId))
    : null;
}

export function getServiceTaskActions(
  service: Service,
  activeSortId: number | null,
  userId: number | string | null | undefined,
  canProcess: boolean,
) {
  const task = service.seServiceTask;
  const allowed = canProcess && userId != null && !!task?.id;
  return {
    canComplete:
      allowed &&
      task?.serviceTaskStatus === 0 &&
      service.sortId === activeSortId &&
      !!task.seServiceTaskUsers?.some(
        (user) => String(user.userId) === String(userId),
      ),
    canCancel:
      allowed &&
      task?.serviceTaskStatus === 1 &&
      task.completionUserId != null &&
      String(task.completionUserId) === String(userId),
  };
}
