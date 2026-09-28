/**
 * 按 bizType 从 transportOrder 上取业务线简要（船名/航次/港口等）。
 * 四者互斥：0 海出 / 1 海进 / 2 空出 / 3 件杂货。
 */

export type TransportOrderBizType = 0 | 1 | 2 | 3;

export interface TransportOrderBizLinePort {
  portName?: null | string;
  cnName?: null | string;
  iataCode?: null | string;
  code?: null | string;
  enName?: null | string;
}

export interface TransportOrderBizLineSource {
  bizType?: number | null;
  seaExport?: null | Record<string, any>;
  seaImport?: null | Record<string, any>;
  airExport?: null | Record<string, any>;
  breakBulk?: null | Record<string, any>;
}

/** 取当前业务线子对象（按 bizType；无 bizType 时按非空子对象兜底） */
export function resolveTransportOrderBizLine(
  order?: null | TransportOrderBizLineSource,
): null | Record<string, any> {
  if (!order) return null;
  const { bizType } = order;
  if (bizType === 0) return order.seaExport ?? null;
  if (bizType === 1) return order.seaImport ?? null;
  if (bizType === 2) return order.airExport ?? null;
  if (bizType === 3) return order.breakBulk ?? null;
  return (
    order.seaExport ??
    order.seaImport ??
    order.airExport ??
    order.breakBulk ??
    null
  );
}

/** 海港/空港展示名 */
export function formatBizLinePortName(
  port?: null | TransportOrderBizLinePort,
  isAir = false,
): string {
  if (!port) return '';
  if (isAir) {
    return port.iataCode || port.cnName || port.enName || port.code || '';
  }
  return port.portName || port.cnName || port.code || port.enName || '';
}

/** 起运港展示名 */
export function formatTransportOrderPol(
  order?: null | TransportOrderBizLineSource,
): string {
  const line = resolveTransportOrderBizLine(order);
  return formatBizLinePortName(line?.pol, order?.bizType === 2);
}

/** 目的港展示名 */
export function formatTransportOrderPod(
  order?: null | TransportOrderBizLineSource,
): string {
  const line = resolveTransportOrderBizLine(order);
  return formatBizLinePortName(line?.pod, order?.bizType === 2);
}

/** 船名/航次或航班展示：海出/海进/件杂货用 vessel+innerVoyno，空出用 flightNo */
export function formatTransportOrderVesselVoyage(
  order?: null | TransportOrderBizLineSource,
): string {
  const line = resolveTransportOrderBizLine(order);
  if (!line) return '';
  if (order?.bizType === 2) {
    return line.flightNo || '';
  }
  const vessel = line.vessel || '';
  const voyno = line.innerVoyno || '';
  return [vessel, voyno].filter(Boolean).join(' ');
}
