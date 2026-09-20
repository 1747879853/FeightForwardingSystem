import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { createApp, h, nextTick, ref } from 'vue';

import { describe, expect, it } from 'vitest';

import { rowTextColumn } from './row-text-column';

const require = createRequire(resolve('packages/effects/plugins/package.json'));
const { VxeGrid } = require('vxe-table');

describe('多字段文本列刷新', () => {
  it('同一票重新加载后显示最新人员、港口、金额和航次，原字段不变也不复用旧文本', async () => {
    const makeRow = (version: number) => ({
      id: 'same-ticket',
      orderUsers: [{ name: `操作${version}` }],
      polRemark: `港口${version}`,
      vessel: 'SAME SHIP',
      voyage: `V${version}`,
      groups: [{ currency: 'USD', amount: version * 100 }],
      shipperContent: `发货人${version}`,
    });
    type Row = ReturnType<typeof makeRow>;
    const columns = [
      {
        field: 'operationUserName',
        ...rowTextColumn<Row>(({ row }) =>
          row.orderUsers.map((user) => user.name).join('、'),
        ),
      },
      { field: 'polName', ...rowTextColumn<Row>(({ row }) => row.polRemark) },
      {
        field: 'vessel',
        ...rowTextColumn<Row>(({ row }) => `${row.vessel} / ${row.voyage}`),
      },
      {
        field: 'currency_USD_receive',
        ...rowTextColumn<Row>(
          ({ row }) =>
            row.groups.find((group) => group.currency === 'USD')?.amount,
        ),
      },
      {
        field: 'shipper.name',
        ...rowTextColumn<Row>(({ row }) => row.shipperContent),
      },
    ];
    const grid = ref<any>();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(VxeGrid, {
          ref: grid,
          columns,
          data: [makeRow(1)],
          rowConfig: { keyField: 'id' },
        }),
    });
    try {
      app.mount(host);
      await nextTick();
      await grid.value.loadData([makeRow(1)]);
      await nextTick();
      expect(host.textContent).toContain('操作1');
      expect(host.textContent).toContain('SAME SHIP / V1');

      await grid.value.loadData([makeRow(2)]);
      await nextTick();
      for (const value of [
        '操作2',
        '港口2',
        'SAME SHIP / V2',
        '200',
        '发货人2',
      ]) {
        expect(host.textContent).toContain(value);
      }
      expect(host.textContent).not.toContain('操作1');
      expect(host.textContent).not.toContain('SAME SHIP / V1');
      expect(columns[3]!.exportMethod({ row: makeRow(2) })).toBe('200');
    } finally {
      app.unmount();
      host.remove();
    }
  });

  it('原地修改集合与回退字段也更新，保持 0 和空值语义，文本不作为 HTML 执行', async () => {
    const row = ref({ items: [10], fallback: '<b>普通文本</b>' });
    const column = rowTextColumn<typeof row.value>(({ row: current }) =>
      current.items.length
        ? current.items.reduce((a, b) => a + b, 0)
        : current.fallback,
    );
    const host = document.createElement('div');
    const app = createApp({
      render: () => h('div', column.slots.default({ row: row.value })),
    });
    try {
      app.mount(host);
      expect(host.textContent).toBe('10');
      row.value.items[0] = 0;
      await nextTick();
      expect(host.textContent).toBe('0');
      row.value.items = [];
      await nextTick();
      expect(host.textContent).toBe('<b>普通文本</b>');
      expect(host.querySelector('b')).toBeNull();
      expect(column.exportMethod({ row: row.value })).toBe('<b>普通文本</b>');
      row.value.fallback = '';
      await nextTick();
      expect(host.textContent).toBe('');
      expect(rowTextColumn(() => null).exportMethod({ row: {} })).toBe('');
    } finally {
      app.unmount();
    }
  });
});
