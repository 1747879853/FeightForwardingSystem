/** 腾讯位置服务微信小程序 JS SDK（官方 CJS 包，仅用 geocoder） */
declare module '@/libs/qqmap-wx-jssdk.min.js' {
  export interface QqMapGeocoderOptions {
    address: string;
    region?: string;
    success?: (res: QqMapGeocoderResult) => void;
    fail?: (err: { message?: string; status?: number }) => void;
    complete?: (res: unknown) => void;
  }

  export interface QqMapGeocoderResult {
    status: number;
    message: string;
    result?: {
      location?: {
        lat: number;
        lng: number;
      };
      title?: string;
      similarity?: number;
      deviation?: number;
      reliability?: number;
    };
  }

  export default class QQMapWX {
    constructor(options: { key: string });
    geocoder(options: QqMapGeocoderOptions): void;
  }
}
