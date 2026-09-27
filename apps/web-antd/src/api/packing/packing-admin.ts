import { requestClient } from '#/api/request';

/** 装箱试算：不读箱型主数据、不落库 */
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
