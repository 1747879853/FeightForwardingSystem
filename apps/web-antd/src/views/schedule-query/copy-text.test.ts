import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyTextToClipboard } from './copy-text';

function stubExecCommand(result: boolean) {
  const execCommand = vi.fn().mockReturnValue(result);
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand,
    writable: true,
  });
  return execCommand;
}

describe('copyTextToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, 'execCommand');
  });

  it('uses clipboard.writeText when it succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const execCommand = stubExecCommand(true);

    await expect(copyTextToClipboard('ONE(NPI)')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('ONE(NPI)');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to execCommand when clipboard.writeText rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    });
    const execCommand = stubExecCommand(true);

    await expect(copyTextToClipboard('ONE(NPI)')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back to execCommand when clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {});
    const execCommand = stubExecCommand(true);

    await expect(copyTextToClipboard('MSK(FI3)/ONE(NPI)')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false when both clipboard API and execCommand fail', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    });
    stubExecCommand(false);

    await expect(copyTextToClipboard('ONE(NPI)')).resolves.toBe(false);
  });
});
