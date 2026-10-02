import type { HubConnection } from '@microsoft/signalr';

import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';

import { getApiRootUrl } from '#/utils/attachment-url';

const RETRY_MS = 15_000;

let connection: HubConnection | null = null;
let retryTimer = 0;
let stopped = true;

export function personalMailSignalrUrl(encryptedAccessToken: string) {
  const root = getApiRootUrl();
  const token = encodeURIComponent(encryptedAccessToken.trim());
  return `${root}/signalr?enc_auth_token=${token}`;
}

function clearRetry() {
  if (!retryTimer) return;
  window.clearTimeout(retryTimer);
  retryTimer = 0;
}

async function connect(
  encryptedAccessToken: string,
  onReceived: (payload: PersonalMailAdminApi.PersonalMailReceived) => void,
) {
  if (stopped) return;
  clearRetry();
  const current = connection;
  if (current && current.state !== HubConnectionState.Disconnected) return;

  const next = new HubConnectionBuilder()
    .withUrl(personalMailSignalrUrl(encryptedAccessToken))
    .withAutomaticReconnect()
    .build();
  next.on('personalMail.received', onReceived);
  connection = next;
  try {
    await next.start();
  } catch {
    if (connection === next) connection = null;
    if (stopped) return;
    retryTimer = window.setTimeout(() => {
      void connect(encryptedAccessToken, onReceived);
    }, RETRY_MS);
  }
}

export function startPersonalMailSignalr(
  encryptedAccessToken: string,
  onReceived: (payload: PersonalMailAdminApi.PersonalMailReceived) => void,
) {
  const token = encryptedAccessToken.trim();
  if (!token) return;
  stopped = false;
  void connect(token, onReceived);
}

export async function stopPersonalMailSignalr() {
  stopped = true;
  clearRetry();
  const current = connection;
  connection = null;
  if (!current) return;
  try {
    await current.stop();
  } catch {
    // 连接已经断开时忽略
  }
}
