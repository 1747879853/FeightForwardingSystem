import * as XLSX from 'xlsx';

function toArrayBuffer(data: ArrayBuffer | Uint8Array | number[]) {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
  }
  return Uint8Array.from(data).buffer;
}

function isZipOfficeFile(bytes: Uint8Array) {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function isOleCompoundFile(bytes: Uint8Array) {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}

/**
 * vue-office/excel 底层用 exceljs，只吃 OOXML（.xlsx）。
 * 旧版 BIFF .xls（OLE 复合文档）和 csv 需先经 SheetJS 转成 xlsx。
 */
export function prepareExcelPreviewBuffer(buffer: ArrayBuffer, extension = '') {
  const ext = String(extension || '').toLowerCase();
  const bytes = new Uint8Array(buffer);

  if (isZipOfficeFile(bytes) && ext !== 'csv') {
    return buffer;
  }

  const workbook = isOleCompoundFile(bytes)
    ? XLSX.read(bytes, { type: 'array' })
    : XLSX.read(new TextDecoder().decode(bytes), { type: 'string' });

  if (!workbook.SheetNames?.length) {
    throw new Error('empty workbook');
  }

  return toArrayBuffer(
    XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }),
  );
}
