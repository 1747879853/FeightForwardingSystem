import { LoadingOrderStatus } from '#/api/sea-export/loading-order-admin';

export type LoadingShareLang = 'en' | 'zh';

export interface LoadingShareText {
  title: string;
  eyebrow: string;
  mblNum: string;
  loadingOrder: string;
  basicInfo: string;
  containers: string;
  completedCount: (done: number, total: number) => string;
  noContainers: string;
  ctnNo: string;
  sealNo: string;
  done: string;
  pending: string;
  noPhotos: string;
  noPhotosHint: string;
  photoFallback: string;
  footer: (company: string) => string;
  loading: string;
  needLink: string;
  queryError: string;
  listJoin: string;
  kg: (value: number | string) => string;
  fields: {
    vesselVoyage: string;
    ctnQty: string;
    goods: string;
    kgs: string;
    pkgs: string;
    package: string;
    packageItem: string;
    packageItemQty: string;
    eta: string;
    yard: string;
    supervisors: string;
  };
  status: Record<number, string>;
}

const ZH: LoadingShareText = {
  title: '监装信息',
  eyebrow: '海运出口 / 监装信息',
  mblNum: '主提单号',
  loadingOrder: '监装工单',
  basicInfo: '基本信息',
  containers: '集装箱与现场照片',
  completedCount: (done, total) => `已完成 ${done} / ${total} 箱`,
  noContainers: '暂无集装箱信息，录入后将在此展示',
  ctnNo: '箱号',
  sealNo: '封号',
  done: '已完成',
  pending: '待处理',
  noPhotos: '暂无现场照片',
  noPhotosHint: '上传后可在此查看监装记录',
  photoFallback: '监装照片',
  footer: (company) => (company ? `${company} · 监装信息共享` : '监装信息共享'),
  loading: '正在加载监装信息…',
  needLink: '请通过分享给您的链接访问',
  queryError: '主提单号或监装工单号错误',
  listJoin: '、',
  kg: (value) => `${value} KG`,
  fields: {
    vesselVoyage: '船名航次',
    ctnQty: '箱型箱量',
    goods: '品名',
    kgs: '毛重',
    pkgs: '件数',
    package: '包装',
    packageItem: '明细包装',
    packageItemQty: '明细包装件数',
    eta: '预计到货时间',
    yard: '监装堆场',
    supervisors: '监装师傅',
  },
  status: {
    [LoadingOrderStatus.Unsubmitted]: '未提交',
    [LoadingOrderStatus.Pending]: '待认领',
    [LoadingOrderStatus.Claimed]: '已认领',
    [LoadingOrderStatus.Completed]: '已完成',
  },
};

const EN: LoadingShareText = {
  title: 'Loading Information',
  eyebrow: 'Sea Export / Loading Information',
  mblNum: 'Master B/L No.',
  loadingOrder: 'Loading Order',
  basicInfo: 'Basic Information',
  containers: 'Containers & Photos',
  completedCount: (done, total) => `${done} / ${total} completed`,
  noContainers: 'No container information yet',
  ctnNo: 'Container No.',
  sealNo: 'Seal No.',
  done: 'Completed',
  pending: 'Pending',
  noPhotos: 'No photos yet',
  noPhotosHint: 'Photos will appear here after upload',
  photoFallback: 'Loading photos',
  footer: (company) =>
    company ? `${company} · Loading Information` : 'Loading Information',
  loading: 'Loading…',
  needLink: 'Please open the link shared with you',
  queryError: 'Master B/L or loading order number is incorrect',
  listJoin: ', ',
  kg: (value) => `${value} KG`,
  fields: {
    vesselVoyage: 'Vessel / Voyage',
    ctnQty: 'Container Type & Qty',
    goods: 'Commodity',
    kgs: 'Gross Weight',
    pkgs: 'Packages',
    package: 'Package',
    packageItem: 'Package Item',
    packageItemQty: 'Package Item Qty',
    eta: 'ETA',
    yard: 'Loading Yard',
    supervisors: 'Supervisor',
  },
  status: {
    [LoadingOrderStatus.Unsubmitted]: 'Unsubmitted',
    [LoadingOrderStatus.Pending]: 'Pending',
    [LoadingOrderStatus.Claimed]: 'Claimed',
    [LoadingOrderStatus.Completed]: 'Completed',
  },
};

export function getLoadingShareText(lang: LoadingShareLang): LoadingShareText {
  return lang === 'en' ? EN : ZH;
}
