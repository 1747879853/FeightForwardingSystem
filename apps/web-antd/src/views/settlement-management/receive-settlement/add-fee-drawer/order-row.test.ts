import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { describe, expect, it } from 'vitest';

import { buildOrderRow } from './data';

function group(
  order: ReceiveSettlementAdminApi.TransportOrderSimpleDto,
): ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto {
  return {
    transportOrder: order,
    orderFees: [],
  };
}

describe('添加结算明细业务列', () => {
  it('海运出口带出开船日期、船公司、港口和箱型箱量', () => {
    const row = buildOrderRow(
      group({
        id: 'order-1',
        etd: '2026-09-29T00:00:00',
        totalCtn: '20GP*2 40HQ*1',
        seaExport: {
          carrier: { code: 'MSK' },
          pol: { portName: 'CNSHA', cnName: '上海' },
          pod: { portName: 'USLAX', cnName: '洛杉矶' },
        },
      }),
    );

    expect(row.etd).toBe('2026-09-29');
    expect(row.carrierName).toBe('MSK');
    expect(row.polName).toBe('CNSHA');
    expect(row.podName).toBe('USLAX');
    expect(row.totalCtn).toBe('20GP*2 40HQ*1');
  });

  it('空运没有船公司和箱型箱量，港口用三字码', () => {
    const row = buildOrderRow(
      group({
        id: 'order-2',
        etd: null,
        totalCtn: null,
        airExport: {
          pol: { iataCode: 'PVG', cnName: '浦东' },
          pod: { iataCode: 'LAX' },
        },
      }),
    );

    expect(row.etd).toBe('');
    expect(row.carrierName).toBe('');
    expect(row.polName).toBe('PVG');
    expect(row.podName).toBe('LAX');
    expect(row.totalCtn).toBe('');
  });

  it('件杂货没有船公司，港口用港口代码', () => {
    const row = buildOrderRow(
      group({
        id: 'order-3',
        breakBulk: {
          pol: { portName: 'CNTAO' },
          pod: { cnName: '新加坡' },
        },
      }),
    );

    expect(row.carrierName).toBe('');
    expect(row.polName).toBe('CNTAO');
    expect(row.podName).toBe('新加坡');
  });
});
