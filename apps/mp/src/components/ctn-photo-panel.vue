<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import type { EditableCtn, EditablePhoto } from '@/utils/ctn-model';

import { uploadAndExtractCtnNo } from '@/api/gemini';
import { API_ORIGIN } from '@/api/request';
import {
  chooseImages,
  persistLocalImage,
  uploadImage,
  type ImageSource,
} from '@/api/upload';
import { pickCtnNoFromUpload } from '@/utils/recognized-ctn-no';
import { resolveUploadDisplayUrl } from '@/utils/upload-display-url';

const props = defineProps<{
  ctn: EditableCtn | null;
  editable: boolean;
  saving?: boolean;
  typesEmpty?: boolean;
  visible: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'save'): void;
}>();

const uploading = ref(false);
const recognizing = ref(false);
/** 相机返回后原生 image 常不刷新，hideLoading 后再 bump 一次强制重挂 */
const thumbEpoch = ref(0);
const busy = computed(() => uploading.value || recognizing.value);

const groups = computed(() => props.ctn?.groups ?? []);
const statusText = computed(() =>
  props.ctn?.isLoadingCompleted ? '已完成' : '待处理',
);

function toggleStatus() {
  if (!props.editable || !props.ctn) return;
  props.ctn.isLoadingCompleted = !props.ctn.isLoadingCompleted;
}

function previewGroup(groupIndex: number, photoIndex: number) {
  const urls = groups.value[groupIndex]?.items.map((item) => item.url) ?? [];
  if (urls.length === 0) return;
  uni.previewImage({ current: photoIndex, urls });
}

function choosePhotoSource() {
  return new Promise<ImageSource | null>((resolve, reject) => {
    uni.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (result) => resolve(result.tapIndex === 0 ? 'camera' : 'album'),
      fail: (error) => {
        if (String(error.errMsg || '').includes('cancel')) {
          resolve(null);
          return;
        }
        reject(error);
      },
    });
  });
}

function hideLoadingThen(run: () => void) {
  uni.hideLoading();
  // 微信 hideLoading 会把紧接着的 Toast 吃掉，弹窗也要等原生层收完
  setTimeout(run, 320);
}

function alertAfterLoading(title: string, content: string) {
  hideLoadingThen(() => {
    uni.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '知道了',
    });
  });
}

async function recognizeCtnNo() {
  if (!props.editable || !props.ctn || busy.value || props.saving) return;

  let sourceType: ImageSource | null;
  try {
    sourceType = await choosePhotoSource();
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '无法打开图片来源',
    });
    return;
  }
  if (!sourceType) return;

  let paths: string[];
  try {
    paths = await chooseImages([sourceType], 1);
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '选择图片失败',
    });
    return;
  }
  const filePath = paths[0];
  if (!filePath) return;

  recognizing.value = true;
  uni.showLoading({ mask: true, title: '识别箱号中' });
  try {
    const result = await uploadAndExtractCtnNo(filePath);
    const ctnNo = pickCtnNoFromUpload(result);
    if (!ctnNo) {
      alertAfterLoading(
        '未识别到箱号',
        '请手工填写，或换一张更清晰的箱门照片再试',
      );
      return;
    }
    props.ctn.ctnNo = ctnNo;
    hideLoadingThen(() => {
      uni.showToast({ icon: 'success', title: '已填入箱号' });
    });
  } catch (error) {
    alertAfterLoading(
      '识别失败',
      error instanceof Error && error.message
        ? error.message
        : '请稍后重试或手工填写箱号',
    );
  } finally {
    recognizing.value = false;
  }
}

async function addPhotos(groupIndex: number) {
  const group = groups.value[groupIndex];
  if (!group || busy.value) return;

  let sourceType: ImageSource | null;
  try {
    sourceType = await choosePhotoSource();
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '无法打开图片来源',
    });
    return;
  }
  if (!sourceType) return;

  let paths: string[];
  try {
    paths = await chooseImages([sourceType], sourceType === 'camera' ? 1 : 9);
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '选择图片失败',
    });
    return;
  }
  if (paths.length === 0) return;

  uploading.value = true;
  try {
    for (const path of paths) {
      // 先把本地图推进格子，避免相机页返回后只剩空白等到二次打开
      const localPath =
        sourceType === 'camera' ? await persistLocalImage(path) : path;
      const photo: EditablePhoto = {
        attachmentId: '',
        localPath,
        url: localPath,
      };
      group.items.push(photo);
      await nextTick();

      uni.showLoading({ mask: true, title: '上传中' });
      try {
        const result = await uploadImage(localPath);
        photo.attachmentId = result.attachmentId;
        photo.url = resolveUploadDisplayUrl(
          result.fileUrl || result.filePath,
          localPath,
          API_ORIGIN,
        );
      } catch (error) {
        const index = group.items.indexOf(photo);
        if (index >= 0) group.items.splice(index, 1);
        throw error;
      }
    }
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '上传失败',
    });
  } finally {
    uploading.value = false;
    uni.hideLoading();
    thumbEpoch.value += 1;
  }
}

function onThumbError(photo: EditablePhoto) {
  if (photo.localPath && photo.url !== photo.localPath) {
    photo.url = photo.localPath;
  }
}

function removePhoto(groupIndex: number, photoIndex: number) {
  groups.value[groupIndex]?.items.splice(photoIndex, 1);
}

function onSave() {
  if (!props.editable || props.saving) return;
  if (uploading.value) {
    uni.showToast({ icon: 'none', title: '请等待图片上传完成' });
    return;
  }
  if (recognizing.value) {
    uni.showToast({ icon: 'none', title: '请等待箱号识别完成' });
    return;
  }
  emit('save');
}

function onDismiss() {
  if (props.saving) return;
  emit('close');
}
</script>

<template>
  <view v-if="visible" class="mask" @tap="onDismiss">
    <view class="panel" @tap.stop>
      <view class="panel__head">
        <text class="panel__title">监装处理</text>
        <text class="panel__sub"> 箱号 {{ ctn?.ctnNo || '--' }} </text>
        <view class="panel__close" @tap="onDismiss">
          <wd-icon name="close" size="20px" color="#6e7b83" />
        </view>
      </view>

      <scroll-view class="panel__body" scroll-y>
        <view class="status-card">
          <text class="status-card__label">监装状态</text>
          <view
            :class="['status-card__value', { 'is-editable': editable }]"
            @tap="toggleStatus"
          >
            <view
              :class="[
                'status-card__dot',
                ctn?.isLoadingCompleted ? 'is-done' : 'is-pending',
              ]"
            />
            <text>{{ statusText }}</text>
            <text v-if="editable" class="status-card__hint">点击切换</text>
          </view>
        </view>

        <view v-if="ctn" class="fields">
          <view class="field">
            <text class="field__label">箱号</text>
            <input
              v-if="editable"
              v-model="ctn.ctnNo"
              class="field__input"
              maxlength="32"
              placeholder="请填写箱号"
              placeholder-class="field__placeholder"
            />
            <text v-else class="field__text">{{ ctn.ctnNo || '--' }}</text>
            <view
              v-if="editable"
              :class="['field__scan', { 'is-disabled': busy || saving }]"
              @tap="recognizeCtnNo"
            >
              <wd-icon name="camera" size="16px" color="#327aff" />
              <text>识别</text>
            </view>
          </view>
          <view class="field">
            <text class="field__label">封号</text>
            <input
              v-if="editable"
              v-model="ctn.sealNo"
              class="field__input"
              maxlength="32"
              placeholder="请填写封号"
              placeholder-class="field__placeholder"
            />
            <text v-else class="field__text">{{ ctn.sealNo || '--' }}</text>
          </view>
        </view>

        <text v-if="editable && typesEmpty" class="group__empty">
          未配置监装附件类型
        </text>

        <view
          v-for="(group, gi) in groups"
          :key="String(group.attachmentDtlTypeId ?? 'untyped')"
          class="group"
        >
          <text class="group__title">{{ group.typeName }}</text>
          <view class="group__grid">
            <view
              v-for="(photo, pi) in group.items"
              :key="`${photo.attachmentId}-${photo.url}-${pi}-${thumbEpoch}`"
              class="thumb"
            >
              <image
                class="thumb__img"
                :src="photo.url"
                mode="aspectFill"
                @error="onThumbError(photo)"
                @tap="previewGroup(gi, pi)"
              />
              <view
                v-if="editable"
                class="thumb__remove"
                @tap.stop="removePhoto(gi, pi)"
              >
                <wd-icon name="close" size="12px" color="#fff" />
              </view>
            </view>

            <view v-if="editable" class="thumb thumb--add" @tap="addPhotos(gi)">
              <wd-icon name="camera" size="26px" color="#6e7b83" />
              <text class="thumb__tip">添加图片</text>
            </view>
          </view>

          <text
            v-if="!editable && group.items.length === 0"
            class="group__empty"
          >
            暂无照片
          </text>
        </view>
      </scroll-view>

      <view class="panel__foot">
        <view
          v-if="editable"
          :class="['panel__btn', { 'is-disabled': saving }]"
          @tap="onSave"
        >
          {{ saving ? '保存中…' : '保存' }}
        </view>
        <view v-else class="panel__btn" @tap="onDismiss">关闭</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 45%);
}

.panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 78vh;
  background: $card-bg;
  border-radius: 28rpx 28rpx 0 0;
}

.panel__head {
  position: relative;
  padding: 32rpx 32rpx 20rpx;
  border-bottom: 2rpx solid $divider;
}

.panel__title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-title;
}

.panel__sub {
  margin-left: 16rpx;
  font-size: 24rpx;
  color: $text-label;
}

.panel__close {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  padding: 8rpx;
}

.panel__body {
  flex: 1;
  padding: 8rpx 32rpx;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 2rpx solid $divider;
}

.status-card__label {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-body;
}

.status-card__value {
  display: flex;
  align-items: center;
  min-height: 52rpx;
  padding: 0 18rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: $text-title;
  background: $chip-bg;
  border-radius: 26rpx;
}

.status-card__value.is-editable {
  color: $brand-primary;
  background: $brand-primary-soft;
}

.status-card__dot {
  width: 10rpx;
  height: 10rpx;
  margin-right: 10rpx;
  border-radius: 50%;
}

.status-card__dot.is-done {
  background: $status-done;
}

.status-card__dot.is-pending {
  background: $status-pending;
}

.status-card__hint {
  margin-left: 12rpx;
  font-size: 20rpx;
  color: $text-label;
}

.fields {
  padding-bottom: 8rpx;
  border-bottom: 2rpx solid $divider;
}

.field {
  display: flex;
  align-items: center;
  min-height: 88rpx;
}

.field__label {
  width: 96rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-body;
}

.field__input {
  flex: 1;
  height: 64rpx;
  font-size: 28rpx;
  color: $text-title;
}

.field__placeholder {
  color: #c2c8d2;
}

.field__scan {
  display: flex;
  flex-shrink: 0;
  gap: 6rpx;
  align-items: center;
  height: 56rpx;
  padding: 0 16rpx;
  margin-left: 8rpx;
  font-size: 24rpx;
  color: $brand-primary;
  background: $brand-primary-soft;
  border-radius: 28rpx;
}

.field__scan.is-disabled {
  opacity: 0.5;
}

.field__text {
  flex: 1;
  font-size: 28rpx;
  color: $text-title;
}

.group {
  padding: 24rpx 0;
}

.group__title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-body;
}

.group__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 20rpx;
}

.group__empty {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $text-label;
}

.thumb {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
}

.thumb__img {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}

.thumb__remove {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  background: rgb(0 0 0 / 55%);
  border-radius: 50%;
}

.thumb--add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border: 2rpx dashed #cfd6e0;
}

.thumb__tip {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: $text-label;
}

.panel__foot {
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid $divider;
}

.panel__btn {
  height: 84rpx;
  font-size: 30rpx;
  line-height: 84rpx;
  color: #fff;
  text-align: center;
  background: $brand-primary;
  border-radius: 42rpx;
}

.panel__btn.is-disabled {
  opacity: 0.6;
}
</style>
