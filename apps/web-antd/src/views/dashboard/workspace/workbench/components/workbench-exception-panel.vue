<script lang="ts">
export default {
  name: 'WorkbenchExceptionPanel',
};
</script>

<script lang="ts" setup>
import type { ExceptionSummary } from '../../workbench-data';

interface Props {
  summary: ExceptionSummary;
}

defineProps<Props>();
</script>

<template>
  <aside class="exception-panel">
    <header class="exception-panel__header">
      <div class="exception-panel__title-row">
        <span class="exception-icon">✕</span>
        <h3>{{ summary.title }}</h3>
      </div>
      <span class="exception-panel__badge">{{ summary.countText }}</span>
    </header>

    <article class="exception-card">
      <div class="exception-card__top">
        <h4>{{ summary.orderNo }}</h4>
        <span class="exception-card__tag">{{ summary.badge }}</span>
        <span class="exception-card__time">{{ summary.relativeTime }}</span>
      </div>
      <div class="exception-card__route">
        <div>
          <span>POL</span>
          <strong>{{ summary.pol }}</strong>
        </div>
        <div class="route-line">
          <em>SEA FREIGHT</em>
        </div>
        <div class="pod">
          <span>POD</span>
          <strong>{{ summary.pod }}</strong>
        </div>
      </div>
      <div class="exception-card__issue">
        <p class="exception-card__issue-title">{{ summary.issueTitle }}</p>
        <p class="exception-card__issue-body">{{ summary.issueDescription }}</p>
      </div>
    </article>

    <div class="tip-box">
      <h4>处理提示</h4>
      <p>{{ summary.tipText }}</p>
      <button type="button">{{ summary.actionText }}</button>
    </div>
  </aside>
</template>

<style scoped>
.exception-panel {
  width: 322px;
  min-height: 904px;
  padding-bottom: 20px;
  background: #fff;
  border: 0.5px solid #eff0f2;
  border-radius: 16px;
  box-shadow: 0 2px 8px 0 rgb(150 199 217 / 6%);
}

.exception-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 69px;
  padding: 22px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.exception-panel__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.exception-panel__title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #181b20;
}

.exception-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  color: #eb4747;
  background: #ffecec;
  border: 1px solid #eb4747;
  border-radius: 50%;
}

.exception-panel__badge {
  height: 22px;
  padding: 0 11px;
  font-size: 12px;
  line-height: 22px;
  color: #fff;
  background: #eb4747;
  border-radius: 11px;
}

.exception-card {
  width: 272px;
  padding: 12px 10px 11px;
  margin: 10px auto 0;
  border: 1px solid rgb(235 71 71 / 20%);
  border-radius: 14px;
  box-shadow:
    0 1px 2.5px rgb(23 26 31 / 7%),
    0 0 2px rgb(23 26 31 / 8%);
}

.exception-card__top {
  display: flex;
  gap: 8px;
  align-items: center;
}

.exception-card__top h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #181b20;
}

.exception-card__tag {
  padding: 0 6px;
  font-size: 10px;
  line-height: 16px;
  color: #eb4747;
  background: rgb(235 71 71 / 10%);
  border-radius: 3px;
}

.exception-card__time {
  margin-left: auto;
  font-size: 10px;
  color: #555d6d;
}

.exception-card__route {
  display: flex;
  justify-content: space-between;
  padding-bottom: 10px;
  margin: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.exception-card__route span {
  display: block;
  font-size: 10px;
  color: #9ca3af;
}

.exception-card__route strong {
  font-size: 12px;
  line-height: 18px;
  color: #181b20;
}

.route-line {
  width: 55px;
  margin-top: 12px;
  text-align: center;
  border-top: 1px solid #e5e7eb;
}

.route-line em {
  display: inline-block;
  padding: 0 3px;
  margin-top: -8px;
  font-size: 9px;
  font-style: normal;
  color: #9ca3af;
  background: #fff;
}

.pod {
  text-align: right;
}

.exception-card__issue {
  padding: 8px 12px;
  background: rgb(235 71 71 / 5%);
  border: 1px solid rgb(235 71 71 / 10%);
  border-radius: 9px;
}

.exception-card__issue-title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: #eb4747;
}

.exception-card__issue-body {
  margin: 0;
  font-size: 11px;
  line-height: 17px;
  color: rgb(235 71 71 / 90%);
}

.tip-box {
  width: 290px;
  padding: 16px;
  margin: 455px auto 0;
  background: #f9fafb;
  border: 1px dashed rgb(85 93 109 / 30%);
  border-radius: 8px;
}

.tip-box h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #555d6d;
}

.tip-box p {
  margin: 10px 0 14px;
  font-size: 11px;
  line-height: 18px;
  color: #555d6d;
}

.tip-box button {
  width: 100%;
  height: 32px;
  font-size: 12px;
  color: #258cf4;
  cursor: pointer;
  background: #fff;
  border: 1px solid rgb(37 140 244 / 30%);
  border-radius: 6px;
}

@media (max-width: 1400px) {
  .exception-panel {
    width: 100%;
    min-height: auto;
  }

  .tip-box {
    width: calc(100% - 32px);
    margin-top: 24px;
  }
}
</style>
