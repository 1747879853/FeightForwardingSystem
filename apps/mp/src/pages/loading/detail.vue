<script setup lang="ts">
import type { AttachmentDtlTypeSimpleDto } from '@/api/attachment-dtl-type';
import type { LoadingOrderDetailDto } from '@/api/loading-order';
import type { EditableCtn } from '@/utils/ctn-model';

import { onLoad, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';

import { getOrderCtnLoadingAttachmentTypes } from '@/api/attachment-dtl-type';
import {
  cancelLoadingOrderComplete,
  claimLoadingOrder,
  editLoadingOrderCtns,
  getLoadingOrderDetail,
  isNoSupervisionError,
  LoadingOrderStatus,
  rejectLoadingOrder,
} from '@/api/loading-order';
import CtnPhotoPanel from '@/components/ctn-photo-panel.vue';
import {
  countPhotos,
  toCtnEditPayload,
  toEditableCtns,
} from '@/utils/ctn-model';
import {
  ctnSummary,
  EMPTY_TEXT,
  formatDate,
  joinNames,
  textOr,
  vesselVoyage,
} from '@/utils/format';

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight ?? 20);
const orderId = ref('');
const detail = ref<LoadingOrderDetailDto | null>(null);
const ctns = ref<EditableCtn[]>([]);
const attachmentTypes = ref<AttachmentDtlTypeSimpleDto[]>([]);
const loading = ref(false);
const submitting = ref(false);
const noPermission = ref(false);

const photoPanelVisible = ref(false);
const activeCtnIndex = ref(-1);
const ctnDraft = ref<EditableCtn | null>(null);
const rejectVisible = ref(false);
const rejectReason = ref('');

const routeStatus = ref(-1);
const actionsReady = ref(false);
const status = computed(() => detail.value?.status ?? routeStatus.value);
/** 只有已认领能改箱；已完成需先取消完成 */
const editable = computed(() => status.value === LoadingOrderStatus.Claimed);
const typesEmpty = computed(() => attachmentTypes.value.length === 0);
const activeCtn = computed(() => ctns.value[activeCtnIndex.value] ?? null);

const basicRows = computed(() => {
  const item = detail.value;
  if (!item) return [];
  const sea = item.seaExport;
  return [
    { label: '监装工号', value: textOr(item.loadingOrderNum) },
    { label: '提单号', value: textOr(sea?.mblNum) },
    { label: '船名/航次', value: vesselVoyage(sea?.vessel, sea?.innerVoyno) },
    { label: '箱型箱量', value: ctnSummary(item.orderCtns) || EMPTY_TEXT },
    { label: '品名', value: joinNames(sea?.codeGoodss) },
    { label: '毛重', value: sea?.kgs == null ? EMPTY_TEXT : `${sea.kgs}KG` },
    { label: '件数', value: textOr(sea?.pkgs) },
    { label: '包装', value: textOr(sea?.codePackage?.name) },
    { label: '明细包装', value: textOr(item.codePackageItem?.name) },
    { label: '明细包装件数', value: textOr(item.pkgs) },
    { label: '预计送货时间', value: formatDate(item.estimatedArrivalTime) },
    { label: '监装堆场', value: textOr(item.carrierYard?.name) },
    {
      label: '监装师傅',
      value:
        (item.loadingOrderUsers ?? [])
          .map((user) => user.user?.nickName)
          .filter(Boolean)
          .join('、') || EMPTY_TEXT,
    },
  ];
});

/** 师傅端只返回勾选了的明细，直接铺平成标签 */
const requirementTags = computed(() =>
  (detail.value?.loadingRequirements ?? []).flatMap((requirement) =>
    (requirement.loadingRequirementItems ?? [])
      .map((item) => item.name)
      .filter((name): name is string => Boolean(name)),
  ),
);

async function fetchDetail() {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const [result, types] = await Promise.all([
      getLoadingOrderDetail(orderId.value),
      getOrderCtnLoadingAttachmentTypes().catch((error) => {
        uni.showToast({
          icon: 'none',
          title: error instanceof Error ? error.message : '附件类型加载失败',
        });
        return [] as AttachmentDtlTypeSimpleDto[];
      }),
    ]);
    detail.value = result;
    attachmentTypes.value = types;
    ctns.value = toEditableCtns(result.orderCtns, types);
    noPermission.value = false;
  } catch (error) {
    if (isNoSupervisionError(error)) {
      noPermission.value = true;
    } else {
      uni.showToast({
        icon: 'none',
        title: error instanceof Error ? error.message : '加载失败',
      });
    }
  } finally {
    loading.value = false;
  }
}

function goBack() {
  uni.navigateBack();
}

function cloneCtn(ctn: EditableCtn): EditableCtn {
  return {
    ...ctn,
    groups: ctn.groups.map((group) => ({
      ...group,
      items: group.items.map((photo) => ({ ...photo })),
    })),
  };
}

function openPhotoPanel(index: number) {
  const current = ctns.value[index];
  if (!current) return;
  activeCtnIndex.value = index;
  ctnDraft.value = cloneCtn(current);
  photoPanelVisible.value = true;
}

function closePhotoPanel() {
  if (ctnDraft.value && activeCtnIndex.value >= 0) {
    ctns.value[activeCtnIndex.value] = ctnDraft.value;
  }
  photoPanelVisible.value = false;
  activeCtnIndex.value = -1;
  ctnDraft.value = null;
}

async function runAction(action: () => Promise<unknown>, successText: string) {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await action();
    uni.showToast({ icon: 'none', title: successText });
    await fetchDetail();
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '操作失败',
    });
    // 抢单失败等情况下详情已过期，重新拉一次
    await fetchDetail();
  } finally {
    submitting.value = false;
  }
}

function onClaim() {
  void runAction(() => claimLoadingOrder(orderId.value), '认领成功');
}

async function onSaveFromPanel() {
  if (!detail.value || submitting.value) return;
  submitting.value = true;
  try {
    await editLoadingOrderCtns(orderId.value, toCtnEditPayload(ctns.value));
    uni.showToast({ icon: 'none', title: '已保存' });
    photoPanelVisible.value = false;
    activeCtnIndex.value = -1;
    ctnDraft.value = null;
    await fetchDetail();
  } catch (error) {
    uni.showToast({
      icon: 'none',
      title: error instanceof Error ? error.message : '保存失败',
    });
  } finally {
    submitting.value = false;
  }
}

function onCancelComplete() {
  void runAction(async () => {
    await cancelLoadingOrderComplete(orderId.value);
    uni.showModal({
      showCancel: false,
      title: '已恢复编辑',
      content:
        '取消完成不会清掉各箱的完成勾选，如需保留未完成状态，请先打开监装处理取消至少一个箱子的勾选再保存。',
    });
  }, '已取消完成');
}

function openReject() {
  rejectReason.value = '';
  rejectVisible.value = true;
}

function confirmReject() {
  const reason = rejectReason.value.trim();
  if (!reason) {
    uni.showToast({ icon: 'none', title: '请填写拒接原因' });
    return;
  }
  rejectVisible.value = false;
  void runAction(async () => {
    await rejectLoadingOrder(orderId.value, reason);
    uni.navigateBack();
  }, '已拒接');
}

onLoad((options) => {
  orderId.value = String(options?.id ?? '');
  const parsed = Number(options?.status);
  if (
    parsed === LoadingOrderStatus.Pending ||
    parsed === LoadingOrderStatus.Claimed ||
    parsed === LoadingOrderStatus.Completed
  ) {
    routeStatus.value = parsed;
  }
  void fetchDetail();
});

onShow(() => {
  actionsReady.value = false;
  setTimeout(() => {
    actionsReady.value = true;
  }, 180);
});
</script>

<template>
  <view class="page">
    <view class="hero-bg" />

    <view class="nav" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav__back" @tap="goBack">
        <image
          class="nav__back-icon"
          src="/static/icons/icon-back.svg"
          mode="aspectFit"
        />
      </view>
      <text class="nav__title">详情</text>
    </view>

    <view v-if="noPermission" class="placeholder">
      <text class="placeholder__title">当前账号无监装权限</text>
      <text class="placeholder__desc">
        请联系管理员为你的账号开通监装属性后再进入
      </text>
    </view>

    <template v-else-if="detail">
      <view class="card">
        <view class="card__head">
          <view class="card__bar" />
          <text class="card__title">基本信息</text>
        </view>
        <view v-for="row in basicRows" :key="row.label" class="row">
          <text class="row__label">{{ row.label }}</text>
          <text class="row__value">{{ row.value }}</text>
        </view>
      </view>

      <view class="card">
        <view class="card__head">
          <view class="card__bar" />
          <text class="card__title">监装要求</text>
          <text class="card__count">
            （共计{{ requirementTags.length }}项要求）
          </text>
        </view>

        <view v-if="requirementTags.length > 0" class="tags">
          <text v-for="tag in requirementTags" :key="tag" class="tags__item">
            {{ tag }}
          </text>
        </view>
        <text v-else class="empty-line">本工单未勾选监装要求</text>

        <text class="section-title">详细说明</text>
        <view class="note">
          <text class="note__text">
            {{ detail.remark || '暂无详细说明' }}
          </text>
        </view>
      </view>

      <view class="card">
        <view class="card__head">
          <view class="card__bar" />
          <text class="card__title">集装箱要求</text>
        </view>

        <view class="table__head">
          <text class="col col--no">序号</text>
          <text class="col col--type">箱型</text>
          <text class="col col--input">箱号</text>
          <text class="col col--input">封号</text>
          <text class="col col--handling">监装处理</text>
        </view>

        <view v-for="(ctn, index) in ctns" :key="ctn.id" class="table__row">
          <text class="col col--no">{{ index + 1 }}</text>
          <text class="col col--type">{{ ctn.ctnName }}</text>

          <view class="col col--input">
            <text class="cell-text">{{ ctn.ctnNo || EMPTY_TEXT }}</text>
          </view>

          <view class="col col--input">
            <text class="cell-text">{{ ctn.sealNo || EMPTY_TEXT }}</text>
          </view>

          <view class="col col--handling">
            <view class="handling-btn" @tap="openPhotoPanel(index)">
              <view
                :class="[
                  'handling-btn__dot',
                  ctn.isLoadingCompleted ? 'dot--done' : 'dot--pending',
                ]"
              />
              <text class="handling-btn__text">
                {{ ctn.isLoadingCompleted ? '已完成' : '待处理' }}
              </text>
              <text v-if="countPhotos(ctn) > 0" class="handling-btn__count">
                {{ countPhotos(ctn) }}图
              </text>
            </view>
          </view>
        </view>

        <text v-if="ctns.length === 0" class="empty-line">
          该海运出口暂无箱型
        </text>
      </view>

      <view class="footer-space" />
    </template>

    <view v-if="actionsReady && !noPermission && status > 0" class="actions">
      <template v-if="status === LoadingOrderStatus.Pending">
        <view class="actions__btn" @tap="onClaim">认领</view>
      </template>
      <template v-else-if="status === LoadingOrderStatus.Claimed">
        <view class="actions__btn actions__btn--ghost" @tap="openReject">
          拒接
        </view>
      </template>
      <template v-else-if="status === LoadingOrderStatus.Completed">
        <view class="actions__btn actions__btn--ghost" @tap="onCancelComplete">
          取消完成
        </view>
      </template>
    </view>

    <view v-else-if="loading" class="placeholder">
      <text class="placeholder__desc">加载中…</text>
    </view>

    <CtnPhotoPanel
      :ctn="activeCtn"
      :editable="editable"
      :saving="submitting"
      :types-empty="typesEmpty"
      :visible="photoPanelVisible"
      @close="closePhotoPanel"
      @save="onSaveFromPanel"
    />

    <view v-if="rejectVisible" class="mask" @tap="rejectVisible = false">
      <view class="dialog" @tap.stop>
        <text class="dialog__title">拒接工单</text>
        <view class="dialog__field">
          <textarea
            v-model="rejectReason"
            class="dialog__input"
            maxlength="1024"
            placeholder="请填写拒接原因"
            placeholder-class="cell-input__placeholder"
          />
        </view>
        <view class="dialog__actions">
          <view
            class="actions__btn actions__btn--ghost"
            @tap="rejectVisible = false"
          >
            取消
          </view>
          <view class="actions__btn" @tap="confirmReject">确认拒接</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  position: relative;
  min-height: 100vh;
  padding-bottom: 40rpx;
  background: $page-bg;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100%;
  height: 565rpx;
  pointer-events: none;
  background: $hero-gradient;
}

.nav,
.card,
.placeholder,
.actions,
.mask {
  position: relative;
  z-index: 1;
}

.nav {
  position: relative;
  box-sizing: content-box;
  display: flex;
  align-items: center;
  height: 88rpx;
}

.nav__back {
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  padding-left: 16rpx;
}

.nav__back-icon {
  width: 32rpx;
  height: 32rpx;
  transform: rotate(90deg);
}

.nav__title {
  position: absolute;
  left: 0;
  width: 100%;
  font-size: 38rpx;
  font-weight: 500;
  line-height: 38rpx;
  color: $text-title;
  text-align: center;
}

.card {
  padding: 32rpx 28rpx 28rpx;
  margin: 0 28rpx 20rpx;
  background: $card-bg;
  border-radius: 24rpx;
}

.card__head {
  display: flex;
  align-items: center;
  margin-bottom: 36rpx;
}

.card__bar {
  width: 7rpx;
  height: 26rpx;
  margin-right: 16rpx;
  background: linear-gradient(180deg, #327aff 0%, rgb(50 122 255 / 50%) 100%);
  border-radius: 4rpx;
}

.card__title {
  font-size: 28rpx;
  font-weight: 700;
  line-height: 28rpx;
  color: $text-title;
}

.card__count {
  margin-left: 8rpx;
  font-size: 24rpx;
  font-weight: 500;
  color: $text-label;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68rpx;
}

.row__label {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-label;
}

.row__value {
  max-width: 60%;
  font-size: 28rpx;
  font-weight: 500;
  color: $text-title;
  text-align: right;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 0 0 8rpx;
}

.tags__item {
  height: 48rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 48rpx;
  color: $brand-primary;
  background: $brand-primary-soft;
  border-radius: 24rpx;
}

.section-title {
  display: block;
  margin: 28rpx 0 20rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: $text-title;
}

.note {
  padding: 24rpx 28rpx;
  background: rgb(218 223 231 / 12%);
  border: 1rpx solid $divider;
  border-radius: 16rpx;
}

.note__text {
  font-size: 24rpx;
  line-height: 40rpx;
  color: $text-label;
}

.empty-line {
  display: block;
  padding: 24rpx 0;
  font-size: 26rpx;
  color: $text-label;
}

.table__head,
.table__row {
  display: flex;
  align-items: center;
}

.table__head {
  height: 52rpx;
  margin-top: 16rpx;
  background: #eef1f2;
  border-radius: 12rpx 12rpx 0 0;
}

.table__row {
  min-height: 58rpx;
  border-bottom: 1rpx solid $divider;
}

.col {
  padding: 0 6rpx;
  font-size: 20rpx;
  font-weight: 500;
  color: $text-title;
  text-align: center;
}

.table__head .col {
  color: $text-label;
}

.col--no {
  width: 68rpx;
}

.col--type {
  width: 106rpx;
}

.col--input {
  flex: 1;
}

.col--handling {
  width: 192rpx;
}

.cell-input {
  width: 100%;
  height: 48rpx;
  font-size: 20rpx;
  text-align: center;
  background: $chip-bg;
  border-radius: 10rpx;
}

.cell-input__placeholder {
  font-size: 20rpx;
  color: #c2c8d2;
}

.cell-text {
  font-size: 20rpx;
  color: $text-title;
}

.handling-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 156rpx;
  height: 38rpx;
  margin: 0 auto;
  background: $chip-bg;
  border-radius: 24rpx;
}

.handling-btn__text,
.handling-btn__count {
  font-size: 18rpx;
  font-weight: 500;
  color: $text-title;
}

.handling-btn__count {
  margin-left: 8rpx;
  color: $brand-primary;
}

.handling-btn__dot {
  width: 10rpx;
  height: 10rpx;
  margin-right: 8rpx;
  border-radius: 50%;
}

.dot--done {
  background: $status-done;
}

.dot--pending {
  background: $status-pending;
}

.footer-space {
  height: 140rpx;
}

.actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  gap: 20rpx;
  padding: 16rpx 28rpx calc(16rpx + env(safe-area-inset-bottom));
  background: $card-bg;
  box-shadow: 0 -4rpx 16rpx rgb(29 26 39 / 6%);
}

.actions__btn {
  flex: 1;
  height: 84rpx;
  font-size: 30rpx;
  line-height: 84rpx;
  color: #fff;
  text-align: center;
  background: $brand-primary;
  border-radius: 42rpx;
}

.actions__btn--ghost {
  color: $brand-primary;
  background: $brand-primary-soft;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 60rpx;
}

.placeholder__title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-title;
}

.placeholder__desc {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $text-label;
  text-align: center;
}

.mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 45%);
}

.dialog {
  box-sizing: border-box;
  width: 600rpx;
  padding: 32rpx;
  background: $card-bg;
  border-radius: 24rpx;
}

.dialog__title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-title;
}

.dialog__field {
  box-sizing: border-box;
  padding: 20rpx;
  margin: 24rpx 0;
  background: $chip-bg;
  border-radius: 16rpx;
}

.dialog__input {
  width: 100%;
  height: 200rpx;
  font-size: 26rpx;
}

.dialog__actions {
  display: flex;
  gap: 20rpx;
}
</style>
