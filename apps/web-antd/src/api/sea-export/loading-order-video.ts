import { requestClient } from '#/api/request';

export interface LoadingVideoQuery {
  mblNum: string;
  loadingOrderNum: string;
}

export interface LoadingVideoViewers {
  viewerCount: number;
  maxViewerCount: number;
}

export interface LoadingVideoPlay extends LoadingVideoViewers {
  camera: { cameraNo: number; name: string };
  flvUrl: string;
}

const PREFIX = '/services/app/LoadingOrderVideo';
const PUBLIC_OPTIONS = { skipAuth: true, skipErrorMessage: true };

export function startLoadingVideo(
  data: LoadingVideoQuery,
  signal?: AbortSignal,
) {
  return requestClient.post<LoadingVideoPlay>(
    `${PREFIX}/StartPlayAsync`,
    data,
    {
      ...PUBLIC_OPTIONS,
      timeout: 120_000,
      signal,
    },
  );
}

export function getLoadingVideoViewers(
  params: LoadingVideoQuery,
  signal?: AbortSignal,
) {
  return requestClient.get<LoadingVideoViewers>(
    `${PREFIX}/GetViewerCountAsync`,
    {
      ...PUBLIC_OPTIONS,
      params,
      signal,
    },
  );
}

export function controlLoadingVideo(
  data: LoadingVideoQuery & { command: number },
) {
  return requestClient.post<boolean>(`${PREFIX}/PtzAsync`, data, {
    ...PUBLIC_OPTIONS,
    timeout: 15_000,
  });
}

export function loadingVideoError(error: unknown, fallback: string) {
  const failure = error as {
    response?: { data?: { error?: { message?: string }; message?: string } };
    error?: { message?: string };
    message?: string;
  };
  const axiosStatus = failure?.message?.match(
    /^Request failed with status code \d+$/,
  );
  return (
    failure?.response?.data?.error?.message?.trim() ||
    failure?.response?.data?.message?.trim() ||
    failure?.error?.message?.trim() ||
    (axiosStatus ? '' : failure?.message?.trim()) ||
    fallback
  );
}
