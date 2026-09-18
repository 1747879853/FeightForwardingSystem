import { expect, it, vi } from 'vitest';

vi.mock('@/api/request', () => ({ buildAttachmentUrl: (url: string) => url }));

import { toCtnEditPayload, toEditableCtns } from './ctn-model';

it('同一分类多图在回显、追加、删除和保存时均完整保留，其它分类不会丢失', () => {
  const ctns = toEditableCtns([
    {
      id: '100',
      attachmentGroups: [
        {
          attachmentDtlTypeId: '10',
          items: [
            { attachmentId: '1', url: '/1.jpg' },
            { attachmentId: '2', url: '/2.jpg' },
          ],
        },
        {
          attachmentDtlTypeId: '20',
          items: [{ attachmentId: '3', url: '/3.jpg' }],
        },
      ],
    },
  ]);
  const firstGroup = ctns[0]!.groups[0]!;
  expect(firstGroup.items).toHaveLength(2);
  firstGroup.items.push({ attachmentId: '4', url: '/4.jpg' });
  firstGroup.items.splice(0, 1);
  const payload = toCtnEditPayload(ctns)[0]!;
  expect(payload.attachmentGroups).toEqual([
    {
      attachmentDtlTypeId: '10',
      items: [
        { attachmentId: '2', attachmentDtlTypeId: '10', displayOrder: 0 },
        { attachmentId: '4', attachmentDtlTypeId: '10', displayOrder: 1 },
      ],
    },
    {
      attachmentDtlTypeId: '20',
      items: [
        { attachmentId: '3', attachmentDtlTypeId: '20', displayOrder: 0 },
      ],
    },
  ]);
});
