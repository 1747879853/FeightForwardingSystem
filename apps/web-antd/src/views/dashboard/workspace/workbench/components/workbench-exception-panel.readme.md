# workbench-exception-panel

## 作用

右侧异常业务侧栏，包含异常摘要卡、异常单详情、处理提示及快捷动作按钮。

## Props

- `summary: ExceptionSummary`

## Emits

- 当前版本未输出事件（纯展示）。

## 对接建议

- 可在“异常单号”“一键通知客户经理”上增加点击事件，透出异常单 id。
- 建议后续支持异常列表轮播或虚拟列表，适应高频告警场景。
