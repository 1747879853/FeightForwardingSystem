<script setup lang="ts">
import { computed, ref } from 'vue';

import type { EditableCtn, EditablePhoto } from '@/utils/ctn-model';

import { chooseImages, uploadImage, type ImageSource } from '@/api/upload';

const props = defineProps<{
  ctn: EditableCtn | null;
  editable: boolean;
  saving?: boolean;
  visible: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'save'): void;
}>();

const uploading = ref(false);

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

async function addPhotos(groupIndex: number) {
  const group = groups.value[groupIndex];
  if (!group || uploading.value) return;

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
  uni.showLoading({ mask: true, title: '上传中' });
  try {
    for (const path of paths) {
      // 逐张上传，任一张失败即停，已上传的保留在本地待保存
      const result = await uploadImage(path);
      const photo: EditablePhoto = {
        attachmentId: result.attachmentId,
        url: result.fileUrl || path,
      };
      group.items.push(photo);
    }
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '上传失败',
    });
  } finally {
    uploading.value = false;
    uni.hideLoading();
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

        <view v-for="(group, gi) in groups" :key="gi" class="group">
          <text class="group__title">{{ group.typeName }}</text>
          <view class="group__grid">
            <view
              v-for="(photo, pi) in group.items"
              :key="`${photo.attachmentId}-${pi}`"
              class="thumb"
            >
              <image
                class="thumb__img"
                :src="photo.url"
                mode="aspectFill"
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
