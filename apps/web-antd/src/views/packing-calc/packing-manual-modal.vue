<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';

defineOptions({ name: 'PackingManualModal' });

const [Modal, modalApi] = useVbenModal({
  title: '装箱试算 · 操作说明书',
  class: 'w-[760px]',
  footer: false,
});

defineExpose({
  open: () => modalApi.open(),
});
</script>

<template>
  <Modal>
    <div class="packing-manual">
      <section>
        <h3>一、怎么算一票货</h3>
        <ol>
          <li>
            右侧选柜型（或填柜内径、限重），左侧录入货物长宽高、件数、毛重。
          </li>
          <li>按需打开「自动最少开柜」、自叠/平铺/间隙等规则。</li>
          <li>
            底部点「生成方案」→ 中间看 3D 与装载顺序；「多柜型对比」可并算
            20/40/40HQ。
          </li>
        </ol>
      </section>

      <section>
        <h3>二、货物清单（左侧）</h3>
        <p class="packing-manual__lead">
          顶部会实时显示本清单的总件数、总体积、总毛重。
        </p>
        <dl class="packing-manual__dl">
          <div>
            <dt>单位 cm / mm / m</dt>
            <dd>
              选择你习惯的尺寸单位。切换单位只改数字怎么显示，货物真实大小不变。
            </dd>
          </div>
          <div>
            <dt>下载模板 / Excel 导入</dt>
            <dd>
              可先下载模板，按表头填好后导入。格式不对或数据有问题的行会提示，并自动跳过；支持
              Excel、CSV 文件。
            </dd>
          </div>
          <div>
            <dt>货物名称</dt>
            <dd>
              选填。会出现在立体图图例、未装说明、指导书和现场说明里，方便辨认货种。
            </dd>
          </div>
          <div>
            <dt>长 / 宽 / 高</dt>
            <dd>
              单件外包装尺寸（按当前单位填写）。关闭「允许旋转」时：长朝柜长方向、宽朝柜宽方向、高为竖直。须大于
              0；按厘米计一般不超过 5000。
            </dd>
          </div>
          <div>
            <dt>单件毛重 (kg)</dt>
            <dd>
              单件重量，用于判断是否超限重、估算重心。单件比限重还重时，这件装不进柜。
            </dd>
          </div>
          <div>
            <dt>件数</dt>
            <dd>
              该行有多少件。单行最多 800 件，整张清单合计也不宜超过 800 件。
            </dd>
          </div>
          <div>
            <dt>分组</dt>
            <dd>
              填写相同分组名的货物，会尽量装进同一只柜，适合「这几票货不要拆柜」的场景。
            </dd>
          </div>
          <div>
            <dt>允许旋转</dt>
            <dd>
              打开后系统会尝试多种摆放朝向，往往更容易装下；关闭则严格按你填的长、宽、高方向摆放。
            </dd>
          </div>
          <div>
            <dt>可承重</dt>
            <dd>表示这件货上面是否还能叠别的货。请按货品实际承重能力勾选。</dd>
          </div>
          <div>
            <dt>破损置顶</dt>
            <dd>勾选后，尽量把破损或易损货放在上层，减少被压风险。</dd>
          </div>
          <div>
            <dt>膨胀长 / 宽 / 高</dt>
            <dd>
              给易变形、软包装或需留余量的货预留额外外廓。填写后，试算会按「尺寸
              + 膨胀」来占位。
            </dd>
          </div>
          <div>
            <dt>新增货物 / 删除</dt>
            <dd>增加或删除一行货物。点击某一行，立体图里同色货物会高亮。</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>三、装载规则（左侧下方）</h3>
        <dl class="packing-manual__dl">
          <div>
            <dt>间隙长 / 间隙宽</dt>
            <dd>
              相邻两件货之间，沿柜长、柜宽方向要留的空隙。只加在货与货之间，贴柜壁不再额外加。填
              0 表示贴紧摆放。
            </dd>
          </div>
          <div>
            <dt>货物自叠</dt>
            <dd>打开后，只有同一行货物可以上下叠放；不同行的货不能互相叠。</dd>
          </div>
          <div>
            <dt>自叠层数</dt>
            <dd>在开启自叠时，限制同一种货最多叠几层。填 0 表示不限制层数。</dd>
          </div>
          <div>
            <dt>平铺</dt>
            <dd>只装一层，不允许叠高。若同时打开「货物自叠」，以平铺为准。</dd>
          </div>
          <div>
            <dt>叉车顶隙</dt>
            <dd>
              柜顶预留给叉车或人工操作的空间。填写后，可用装货高度会相应减少。
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>四、柜子与规则（右侧）</h3>
        <dl class="packing-manual__dl">
          <div>
            <dt>20GP / 40GP / 40HQ</dt>
            <dd>
              一键填入常用柜内径和建议限重（单位厘米）：20GP 约
              589×235×239；40GP 约 1203×235×239；40HQ 约
              1203×235×269。填入后仍可按实际柜型修改。
            </dd>
          </div>
          <div>
            <dt>箱型主数据</dt>
            <dd>
              从系统维护的箱型里选择，一般会带出限重；名称能对上常见标准柜时，也会带出内径。若内径与实际不符，请手工核对修改。
            </dd>
          </div>
          <div>
            <dt>柜内长 / 宽 / 高</dt>
            <dd>
              柜子可装货的内径尺寸。方向：长是从柜里头到箱门，宽是从左到右，高是离地高度。
            </dd>
          </div>
          <div>
            <dt>限重 (kg)</dt>
            <dd>
              这只柜最多能装多重。填 0 表示不按重量限制（此时载重率会显示为
              0）。
            </dd>
          </div>
          <div>
            <dt>自动最少开柜</dt>
            <dd>
              打开后不用手填「最多开柜数」，系统会按需要算出最少开几只柜。关闭后，可自己指定最多开几只（1～50）。
            </dd>
          </div>
          <div>
            <dt>最多开柜数</dt>
            <dd>
              仅在关闭「自动最少开柜」时出现。货装不下且已到上限时，多出来的会进「未装」。
            </dd>
          </div>
          <div>
            <dt>复制建议箱量 / 返回海出</dt>
            <dd>
              从海运出口订单进入本页时会出现。建议箱量形如
              <code>40HQ*2</code
              >。带回海出页只是提示，还需要您在订单里确认后再改箱型箱量。
            </dd>
          </div>
          <div>
            <dt>恢复草稿 / 清除草稿</dt>
            <dd>
              点「生成方案」后，本机会自动记住最近一次录入和结果。刷新页面后可点「恢复草稿」继续；「清除草稿」后无法再找回。
            </dd>
          </div>
          <div>
            <dt>生成方案</dt>
            <dd>按当前柜子、规则和货物重新试算，并更新中间的立体装载图。</dd>
          </div>
          <div>
            <dt>多柜型对比</dt>
            <dd>
              用同一批货分别试算
              20GP、40GP、40HQ，对比开柜数、未装件数、平均容积率和载重率。点「采用」可把该柜型应用到当前页面并查看方案。
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>五、装载图与结果（中间）</h3>
        <dl class="packing-manual__dl">
          <div>
            <dt>开柜 / 已装 / 未装</dt>
            <dd>
              本方案实际开了几只柜、装进多少件、还有多少件没装上。一件都装不下时，开柜可能为
              0。
            </dd>
          </div>
          <div>
            <dt>柜 1 / 柜 2 …</dt>
            <dd>
              开了多只柜时，可切换查看每一柜的立体图和利用率。「导出顺序」只导出当前正在看的那一只柜。
            </dd>
          </div>
          <div>
            <dt>容积率</dt>
            <dd>
              本柜已装货物体积占柜内容积的比例。货与货之间的间隙不算进已装体积。
            </dd>
          </div>
          <div>
            <dt>载重率</dt>
            <dd>
              本柜已装毛重占限重的比例。限重填 0（不限重）时，载重率显示为 0。
            </dd>
          </div>
          <div>
            <dt>柜长偏移 / 柜宽偏移</dt>
            <dd>
              整柜重心相对柜子中心偏了多少（厘米）。柜长方向会说明偏箱门还是偏里头；柜宽方向会说明偏左还是偏右。偏移大约超过柜尺寸的
              10% 时，会出现偏载告警，建议调整摆放。
            </dd>
          </div>
          <div>
            <dt>播放顺序 / 装载顺序滑条</dt>
            <dd>
              按建议装柜顺序一件件显示；也可拖动滑条查看某一步。一般先装里头，同一位置先装下面。
            </dd>
          </div>
          <div>
            <dt>箱门视角 / 总览</dt>
            <dd>一键切到箱门方向查看，或拉远看整柜全貌。</dd>
          </div>
          <div>
            <dt>层剖切</dt>
            <dd>
              只显示某一高度及以下的货物，方便查看底层摆放。滑到最左（关闭）则显示全部。
            </dd>
          </div>
          <div>
            <dt>图例色块</dt>
            <dd>不同货物行用不同颜色区分；点击色块可高亮对应货物。</dd>
          </div>
          <div>
            <dt>未装货物</dt>
            <dd>
              列出没装上的货物及原因，常见如：单件比柜子还大、单件超限重、按当前规则装不下、已达到最多开柜数。
            </dd>
          </div>
          <div>
            <dt>截图</dt>
            <dd>把当前立体图保存为图片，方便发群或存档。</dd>
          </div>
          <div>
            <dt>导出顺序</dt>
            <dd>导出当前这只柜的装柜顺序表（含件序、位置、尺寸等）。</dd>
          </div>
          <div>
            <dt>指导书</dt>
            <dd>
              导出整份方案的
              Excel：含汇总、各柜明细和未装原因，适合交给现场或存档。
            </dd>
          </div>
          <div>
            <dt>分享现场说明</dt>
            <dd>一键复制文字说明到剪贴板，方便发给监装或现场人员。</dd>
          </div>
        </dl>
        <ul class="packing-manual__note">
          <li>
            <b>怎么看图</b>
            ：柜里头在远处，箱门为红色那一面。橙色点是重心在柜底的投影，绿色区域为相对安全范围。
          </li>
          <li>
            <b>怎么操作</b>
            ：按住左键拖动可旋转，按住 Ctrl 再拖可平移，滚轮可缩放。
          </li>
        </ul>
      </section>

      <section>
        <h3>六、和海运出口订单怎么配合</h3>
        <ul>
          <li>
            <b>从海出进入</b>
            ：在海运出口订单点「装箱试算」可带入本票货信息；若订单没有单件长宽高，系统会按件毛体做粗估，请到本页核对修改。
          </li>
          <li>
            <b>建议箱量</b>
            ：复制或返回海出后，请在订单里确认再改箱型箱量，不会自动改掉订单数据。
          </li>
        </ul>
      </section>

      <p class="packing-manual__tip">
        提示：本页用于估算柜量和查看装载示意，实际装柜请结合货品特性、绑扎要求与现场操作。复杂承重、打托等情况，以现场规范和业务确认结果为准。
      </p>
    </div>
  </Modal>
</template>

<style scoped>
.packing-manual {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 4px 20px;
  font-size: 13px;
  line-height: 1.65;
  color: hsl(var(--foreground));
}

.packing-manual h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--primary));
}

.packing-manual ol,
.packing-manual ul {
  padding-left: 1.25em;
  margin: 0;
}

.packing-manual li + li {
  margin-top: 4px;
}

.packing-manual b {
  font-weight: 600;
}

.packing-manual code {
  padding: 0 4px;
  font-size: 12px;
  background: hsl(var(--muted) / 55%);
  border-radius: 3px;
}

.packing-manual__lead {
  margin: 0 0 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.packing-manual__dl {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.packing-manual__dl > div {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: 8px 12px;
  padding: 8px 10px;
  background: hsl(var(--muted) / 28%);
  border-radius: 6px;
}

.packing-manual__dl dt {
  font-weight: 600;
  line-height: 1.45;
  color: hsl(var(--foreground));
}

.packing-manual__dl dd {
  margin: 0;
  color: hsl(var(--muted-foreground));
}

.packing-manual__note {
  margin-top: 10px;
}

.packing-manual__tip {
  padding: 10px 12px;
  margin: 0;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted) / 40%);
  border-radius: 6px;
}

@media (max-width: 640px) {
  .packing-manual__dl > div {
    grid-template-columns: 1fr;
  }
}
</style>
