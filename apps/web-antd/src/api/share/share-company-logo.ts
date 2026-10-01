import { requestClient } from '#/api/request';

/** 分享页所属公司 Logo 的定位场景，与后端 ShareCompanyLogoScene 一致 */
export enum ShareCompanyLogoScene {
  /** 现有海运运踪 /tracking-map/{mblNo}，no 传主提单号 */
  OceanMbl = 1,
  /** 空运轨迹 /cargo-tracking/air，no 传航司单号 */
  Air = 2,
  /** 新海运轨迹 /cargo-tracking/ocean，no 传链接里的单号，不要传令牌 t */
  OceanBill = 3,
}

export interface ShareCompanyLogoDto {
  /** 所属公司 Logo 直连地址。没上传或找不到业务时为 null */
  companyLogo?: null | string;
}

/**
 * 免登录查询分享页所属公司 Logo。
 * 找不到、没传单号或公司没上传时返回 null，不把分享页打成失败。
 */
export function getShareCompanyLogo(scene: ShareCompanyLogoScene, no: string) {
  return requestClient.get<ShareCompanyLogoDto>(
    '/services/app/ShareCompanyLogo/GetAsync',
    {
      params: { scene, no },
      skipAuth: true,
      skipErrorMessage: true,
    },
  );
}
