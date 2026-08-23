<script setup lang="ts">
import { computed, ref } from 'vue';

import type { EditableCtn, EditablePhoto } from '@/utils/ctn-model';

import { chooseImages, uploadImage } from '@/api/upload';

const props = defineProps<{
  ctn: EditableCtn | null;
  editable: boolean;
  visible: boolean;
}>();

const emit = defineEmits<{ (event: 'close'): void }>();

const uploading = ref(false);

const groups = computed(() => props.ctn?.groups ?? []);

function previewGroup(groupIndex: number, photoIndex: number) {
  const urls = groups.value[groupIndex]?.items.map((item) => item.url) ?? [];
  if (urls.length === 0) return;
  uni.previewImage({ current: photoIndex, urls });
}

async function addPhotos(groupIndex: number) {
  const group = groups.value[groupIndex];
  if (!group || uploading.value) return;

  const paths = await chooseImages();
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
</script>

<template>
  <view v-if="visible" class="mask" @tap="emit('close')">
    <view class="panel" @tap.stop>
      <view class="panel__head">
        <text class="panel__title">监装图片</text>
        <text class="panel__sub"> 箱号 {{ ctn?.ctnNo || '--' }} </text>
        <view class="panel__close" @tap="emit('close')">
          <wd-icon name="close" size="20px" color="#8a94a6" />
        </view>
      </view>

      <scroll-view class="panel__body" scroll-y>
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
              <wd-icon name="camera" size="26px" color="#8a94a6" />
              <text class="thumb__tip">拍照/相册</text>
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
        <text v-if="editable" class="panel__hint">
          照片改动需返回详情页点「保存」后才会提交
        </text>
        <view class="panel__btn" @tap="emit('close')">完成</view>
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

.panel__hint {
  display: block;
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: $text-label;
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
</style>
