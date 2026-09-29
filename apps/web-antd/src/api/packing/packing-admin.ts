import { requestClient } from '#/api/request';

/** 装箱试算：柜子与货物由调用方传入，结果默认不落库 */
const API_PREFIX = '/services/app/PackingAdmin';

export namespace PackingAdminApi {
  export interface PackingCargoInput {
    lineNo?: number;
    name?: string;
    length: number;
    width: number;
    height: number;
    weight: number;
    quantity: number;
    allowRotate: boolean;
    /** 分组键：同组尽量同柜不拆散（后端扩展字段，旧版忽略） */
    groupKey?: string;
    /** 是否可承重；false 时不应被压（后端扩展） */
    supportLoad?: boolean;
    /** 破损/变形置顶（后端扩展） */
    damaged?: boolean;
    /** 膨胀厘米，参与碰撞的外扩（也可由前端计入尺寸后提交） */
    expandLength?: number;
    expandWidth?: number;
    expandHeight?: number;
  }

  export interface PackingCalculateInput {
    length: number;
    width: number;
    height: number;
    limitWeight: number;
    maxContainerCount: number;
    selfStack: boolean;
    flatLay: boolean;
    gapLength: number;
    gapWidth: number;
    cargos: PackingCargoInput[];
    /** 同种货自叠最大层数；0/不传=不限（后端扩展） */
    maxSelfStackLayers?: number;
    /** 顶部叉车预留高度厘米（也可由前端扣减柜高后提交） */
    forkliftClearance?: number;
  }

  export interface PackingPlacement {
    lineNo: number;
    name?: string;
    pieceIndex: number;
    loadOrder: number;
    x: number;
    y: number;
    z: number;
    length: number;
    width: number;
    height: number;
    weight: number;
  }

  export interface PackingContainerResult {
    index: number;
    placedQuantity: number;
    placedVolume: number;
    placedWeight: number;
    volumeRate: number;
    weightRate: number;
    gravityOffsetLength: number;
    gravityOffsetWidth: number;
    placements: PackingPlacement[];
  }

  export interface PackingUnplacedCargo {
    lineNo: number;
    name?: string;
    quantity: number;
    reason: string;
  }

  export interface PackingCalculateResult {
    length: number;
    width: number;
    height: number;
    limitWeight: number;
    selfStack: boolean;
    flatLay: boolean;
    gapLength: number;
    gapWidth: number;
    containerCount: number;
    placedQuantity: number;
    unplacedQuantity: number;
    cargoVolume: number;
    cargoWeight: number;
    placedVolume: number;
    placedWeight: number;
    containers: PackingContainerResult[];
    unplacedCargos: PackingUnplacedCargo[];
  }
}

export function calculatePacking(data: PackingAdminApi.PackingCalculateInput) {
  return requestClient.post<PackingAdminApi.PackingCalculateResult>(
    `${API_PREFIX}/CalculateAsync`,
    data,
  );
}
