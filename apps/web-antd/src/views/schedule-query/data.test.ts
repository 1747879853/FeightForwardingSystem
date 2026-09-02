import { describe, expect, it } from 'vitest';

import type { ScheduleFilters, ScheduleItem } from './data';

import {
  buildAisIframeUrl,
  filterSchedules,
  formatDelayLabel,
  formatDurationFigure,
  formatDurationRange,
  formatGroupWeekdays,
  formatMonthDay,
  formatScheduleMoment,
  formatTerminalPath,
  getAisQuery,
  getGroupName,
  getRouteEtdWeekday,
  getScheduleGroupKey,
  groupSchedules,
  sanitizeScheduleItems,
  splitScheduleMoment,
} from './data';

const baseFilters: ScheduleFilters = {
  carrierCodes: [],
  keyword: '',
  podTerminals: [],
  polTerminals: [],
  transitType: 'all',
};

function createItem(patch: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    carrierCd: 'ONE',
    etd: '2026-09-07T00:00:00',
    eta: '2026-09-27T00:00:00',
    isTransit: false,
    podCode: 'USLAX',
    podTerminalCn: 'PSA',
    polCode: 'CNSHA',
    polTerminalCn: '前湾',
    routeCode: 'PS3',
    routeEtd: 'MON',
    totalDuration: 20,
    vessel: 'OCEAN STAR',
    voyage: 'E001',
    ...patch,
  };
}

describe('schedule query grouping aligned with freightower p2p/group', () => {
  it('builds groupName from sorted share-cabin carrier(route) tokens', () => {
    const item = createItem({
      carrierCd: 'ONE',
      routeCode: 'NPI',
      shareCabins: [
        { carrier: 'MSK', routeCode: 'FI3' },
        { carrier: 'KMTC', routeCode: 'NWX' },
        { carrier: 'JINJIANG', routeCode: 'NWX' },
        { carrier: 'ONE', routeCode: 'NPI' },
      ],
    });
    expect(getGroupName(item)).toBe(
      'JINJIANG(NWX)/KMTC(NWX)/MSK(FI3)/ONE(NPI)',
    );
  });

  it('merges the same service across different routeEtd weekdays', () => {
    const monday = createItem({
      routeCode: 'NPI',
      routeEtd: 'MON',
      shareCabins: [{ carrier: 'ONE', routeCode: 'NPI' }],
      vessel: 'ONE MONDAY',
      voyage: 'M1',
    });
    const saturday = createItem({
      etd: '2026-09-12T00:00:00',
      routeCode: 'NPI',
      routeEtd: 'SAT',
      shareCabins: [{ carrier: 'ONE', routeCode: 'NPI' }],
      vessel: 'ONE SATURDAY',
      voyage: 'S1',
    });
    expect(getScheduleGroupKey(monday)).toBe(getScheduleGroupKey(saturday));
    const groups = groupSchedules([monday, saturday]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[0]?.departureDay).toBe('星期一');
  });

  it('merges the same service across weeks even when duration and transit ports differ', () => {
    const first = createItem({
      etd: '2026-09-02T06:00:00',
      isTransit: true,
      routeCode: 'NPI',
      routeEtd: 'SAT',
      shareCabins: [
        { carrier: 'JINJIANG', routeCode: 'NWX' },
        { carrier: 'KMTC', routeCode: 'NWX' },
        { carrier: 'MSK', routeCode: 'FI3' },
        { carrier: 'ONE', routeCode: 'NPI' },
      ],
      totalDuration: 17,
      transits: [{ portCode: 'KRPUS', portName: 'BUSAN' }],
      vessel: 'MAERSK CHENNAI',
      voyage: '635W',
    });
    const second = createItem({
      etd: '2026-10-17T06:00:00',
      isTransit: true,
      podTerminal: 'PSA CORPORATION LIMITED',
      podTerminalCn: '',
      polTerminal: 'QQCT (QINGDAO QIANWAN CONTAINER TERMINAL)',
      polTerminalCn: '',
      routeCode: 'NPI',
      routeEtd: 'SAT',
      shareCabins: [
        { carrier: 'JINJIANG', routeCode: 'NWX' },
        { carrier: 'KMTC', routeCode: 'NWX' },
        { carrier: 'MSK', routeCode: 'FI3' },
        { carrier: 'ONE', routeCode: 'NPI' },
      ],
      totalDuration: 25,
      transits: [{ portCode: 'CNSHA', portName: 'SHANGHAI' }],
      vessel: 'MAERSK CHENNAI',
      voyage: '642W',
    });

    expect(getScheduleGroupKey(first)).toBe(getScheduleGroupKey(second));
    const groups = groupSchedules([second, first]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.groupName).toBe(
      'JINJIANG(NWX)/KMTC(NWX)/MSK(FI3)/ONE(NPI)',
    );
    expect(groups[0]?.departureDay).toBe('星期六');
    expect(groups[0]?.duration).toBe(25);
    expect(groups[0]?.minDuration).toBe(17);
    expect(groups[0]?.items).toHaveLength(2);
  });

  it('falls back to the operating carrier and route when share cabins are empty', () => {
    expect(getGroupName(createItem({ shareCabins: [] }))).toBe('ONE(PS3)');
    expect(
      getGroupName(
        createItem({ carrierCd: 'RCL', routeCode: '', shareCabins: [] }),
      ),
    ).toBe('RCL');
  });

  it('keeps different share-cabin services as separate schemes', () => {
    const npi = createItem({
      isTransit: true,
      routeCode: 'NPI',
      routeEtd: 'SAT',
      shareCabins: [{ carrier: 'ONE', routeCode: 'NPI' }],
    });
    const sps = createItem({
      isTransit: true,
      routeCode: 'SPS',
      routeEtd: 'WED',
      shareCabins: [],
      vessel: 'NOUMEA CHIEF',
      voyage: '2628S',
    });

    expect(groupSchedules([npi, sps])).toHaveLength(2);
  });

  it('uses routeEtd weekday instead of the actual ETD date', () => {
    const item = createItem({
      etd: '2026-09-02T00:00:00',
      routeEtd: 'SAT',
      staticEtd: '2026-09-02T00:00:00',
    });
    expect(getRouteEtdWeekday(item)).toBe('星期六');
  });

  it('drops feeder / TBN / to-be vessels and dedupes vessel+voyage', () => {
    const usable = createItem({ vessel: 'KOTA GAYA', voyage: 'S432' });
    const tbn = createItem({ vessel: 'TBN', voyage: '001' });
    const feeder = createItem({ vessel: 'FEEDER', voyage: 'F1' });
    const duplicate = createItem({
      etd: '2026-09-18T00:00:00',
      vessel: 'KOTA GAYA',
      voyage: 'S432',
    });

    expect(sanitizeScheduleItems([usable, tbn, feeder])).toEqual([usable]);
    const groups = groupSchedules([usable, tbn, feeder, duplicate]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items).toHaveLength(1);
    expect(groups[0]?.items[0]?.etd).toBe('2026-09-07T00:00:00');
  });

  it('sorts schemes Monday through Sunday', () => {
    const sunday = createItem({
      carrierCd: 'MSC',
      routeCode: 'OCHNA',
      routeEtd: 'SUN',
      vessel: 'MSC ONE',
      voyage: 'S1',
    });
    const monday = createItem({
      carrierCd: 'PIL',
      routeCode: 'RS2',
      routeEtd: 'MON',
      vessel: 'KOTA TWO',
      voyage: 'S2',
    });
    const groups = groupSchedules([sunday, monday]);
    expect(groups.map((group) => group.departureDay)).toEqual([
      '星期一',
      '星期日',
    ]);
  });
});

describe('schedule query frontend filters', () => {
  const items = [
    createItem({
      carrierCd: 'ONE',
      shareCabins: [{ carrier: 'YML', routeCode: 'PS3' }],
    }),
    createItem({
      carrierCd: 'MSK',
      isTransit: true,
      podTerminalCn: 'WBCT',
      polTerminalCn: '外高桥五期',
      routeCode: 'TP6',
      routeEtd: 'WED',
      transits: [{ portCode: 'KRPUS', portName: 'BUSAN' }],
      vessel: 'MAERSK HORIZON',
    }),
  ];

  it('matches a selected carrier through share-cabin data', () => {
    const result = filterSchedules(items, {
      ...baseFilters,
      carrierCodes: ['YML'],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.carrierCd).toBe('ONE');
  });

  it('combines direct/transit, standard terminal, and fuzzy keyword filters', () => {
    const result = filterSchedules(items, {
      ...baseFilters,
      keyword: 'busan',
      podTerminals: ['WBCT'],
      transitType: 'transit',
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.carrierCd).toBe('MSK');
  });

  it('does not mutate the full result set when filtering', () => {
    filterSchedules(items, { ...baseFilters, keyword: 'not-found' });
    expect(items).toHaveLength(2);
  });
});

describe('schedule query display helpers', () => {
  it('hides midnight clock times and keeps real hours', () => {
    expect(formatScheduleMoment('2026-09-07T00:00:00')).toBe('2026-09-07');
    expect(formatScheduleMoment('2026-09-07T18:30:00')).toBe(
      '2026-09-07 18:30',
    );
  });

  it('shows a duration range only when min and max differ', () => {
    expect(formatDurationRange(15, 15)).toBe('15');
    expect(formatDurationRange(10, 28)).toBe('10–28');
    expect(formatDurationRange(undefined, undefined)).toBe('-');
  });

  it('formats card duration and cutoff dates for the design layout', () => {
    expect(formatDurationFigure(6, 8)).toBe('6-8');
    expect(formatDurationFigure(7, 7)).toBe('7');
    expect(formatMonthDay('2026-09-02T12:00:00')).toBe('09-02');
    expect(splitScheduleMoment('2026-09-07T00:00:00')).toEqual({
      date: '2026-09-07',
      time: '',
    });
    expect(splitScheduleMoment('2026-09-07T18:30:00')).toEqual({
      date: '2026-09-07',
      time: '18:30',
    });
  });

  it('lists unique weekdays on the card without splitting the group', () => {
    expect(
      formatGroupWeekdays([
        createItem({ routeEtd: 'TUE', vessel: 'A', voyage: '1' }),
        createItem({ routeEtd: 'SAT', vessel: 'B', voyage: '2' }),
        createItem({ routeEtd: 'THU', vessel: 'C', voyage: '3' }),
        createItem({ routeEtd: 'TUE', vessel: 'D', voyage: '4' }),
      ]),
    ).toBe('周二、周四、周六');
  });

  it('omits empty terminal dashes', () => {
    expect(formatTerminalPath('前湾', 'PSA')).toBe('前湾 → PSA');
    expect(formatTerminalPath('', '')).toBe('');
    expect(formatTerminalPath('前湾', '')).toBe('前湾');
  });

  it('writes delay as a concrete day count', () => {
    expect(formatDelayLabel('2026-09-10', '2026-09-07')).toBe('延误3天');
    expect(formatDelayLabel('2026-09-07', '2026-09-07')).toBe('');
    expect(formatDelayLabel('2026-09-06', '2026-09-07')).toBe('');
  });

  it('prefers numeric MMSI and strips spaces from vessel names', () => {
    expect(getAisQuery({ mmsi: '412345678', vessel: 'WAN HAI 360' })).toBe(
      '412345678',
    );
    expect(getAisQuery({ mmsi: '  ', vessel: 'WAN HAI 360' })).toBe(
      'WANHAI360',
    );
    expect(getAisQuery({ vessel: 'WAN HAI A19' })).toBe('WANHAIA19');
  });

  it('puts AIS query after the hash path in the official param order', () => {
    const url = buildAisIframeUrl('WAN HAI 360');
    if (!url) return;
    expect(url).toContain('#/ais/vessel?');
    expect(url).toContain('mmsi=WANHAI360');
    expect(url).not.toContain('mmsi=WAN%20HAI%20360');
    expect(url).not.toContain('mmsi=WAN+HAI+360');
    expect(url).toContain('lang=zh');
    expect(url).toContain('key=');
    expect(url).toContain('clientId=');
  });

  it('picks the earliest cutoff in a mixed-duration group', () => {
    const groups = groupSchedules([
      createItem({
        cyCutoff: '2026-09-12T12:00:00',
        totalDuration: 20,
        vessel: 'SHIP A',
        voyage: 'A1',
      }),
      createItem({
        cyCutoff: '2026-09-05T08:00:00',
        etd: '2026-09-14T00:00:00',
        totalDuration: 12,
        vessel: 'SHIP B',
        voyage: 'B1',
      }),
    ]);
    expect(groups[0]?.nearestCyCutoff).toBe('2026-09-05T08:00:00');
    expect(groups[0]?.nextEtd).toBe('2026-09-07T00:00:00');
  });
});
