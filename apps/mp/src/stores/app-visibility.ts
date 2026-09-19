import { ref } from 'vue';

/** 只由应用级 onHide 更新；相机等原生窗体的页面 onHide 不计入。 */
export const appBackgroundEpoch = ref(0);
