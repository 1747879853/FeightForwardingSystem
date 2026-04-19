/**
 * 工作流 flat API 结构 (nodes + transitions) 与 UI 树结构 (nodeConfig) 双向转换
 */

const passMethodLabelMap = { 0: '直接通过', 1: '或签', 2: '会签' };

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** API passMethod -> UI examineMode: Pass->依次 Or->依次 And->会签 */
export function passMethodToExamineMode(passMethod) {
  if (passMethod === 2) return 2;
  return 1;
}

export function examineModeToPassMethod(examineMode) {
  if (examineMode === 2) return 2;
  return 0;
}

/**
 * 将 API 返回的 auditors 数组合并回显为三组：userIds / roleIds / userAttributes
 * 以及为 _displayStr 生成文本
 */
export function mergeAuditorsForDisplay(auditors) {
  const userIds = [];
  const roleIds = [];
  const userAttributes = [];
  const userShowTexts = {};
  const roleShowTexts = {};
  const attrShowTexts = {};

  if (!auditors || !auditors.length) {
    return {
      userIds,
      roleIds,
      userAttributes,
      userShowTexts,
      roleShowTexts,
      attrShowTexts,
      displayStr: '',
    };
  }

  for (const a of auditors) {
    if (a.userId != null && a.userId !== 0) {
      if (!userIds.includes(a.userId)) {
        userIds.push(a.userId);
        userShowTexts[a.userId] = a.showText || String(a.userId);
      }
    } else if (a.roleId != null && a.roleId !== 0) {
      if (!roleIds.includes(a.roleId)) {
        roleIds.push(a.roleId);
        roleShowTexts[a.roleId] = a.showText || String(a.roleId);
      }
    } else if (a.userAttribute != null && a.userAttribute !== 0) {
      if (!userAttributes.includes(a.userAttribute)) {
        userAttributes.push(a.userAttribute);
        attrShowTexts[a.userAttribute] = a.showText || String(a.userAttribute);
      }
    }
  }

  const parts = [];
  for (const uid of userIds) parts.push(userShowTexts[uid]);
  for (const rid of roleIds) parts.push(roleShowTexts[rid]);
  for (const attr of userAttributes) parts.push(attrShowTexts[attr]);
  const displayStr = parts.join(', ');

  return {
    userIds,
    roleIds,
    userAttributes,
    userShowTexts,
    roleShowTexts,
    attrShowTexts,
    displayStr,
  };
}

/**
 * 将三个多选框选中值打散为 auditors 数组
 */
export function flattenSelectionsToAuditors(
  userIds,
  roleIds,
  userAttributes,
  userShowTexts = {},
  roleShowTexts = {},
  attrOptions = [],
) {
  const auditors = [];

  for (const uid of userIds || []) {
    auditors.push({
      userId: uid,
      roleId: null,
      userAttribute: 0,
      showText: userShowTexts[uid] || String(uid),
    });
  }

  for (const rid of roleIds || []) {
    auditors.push({
      userId: null,
      roleId: rid,
      userAttribute: 0,
      showText: roleShowTexts[rid] || String(rid),
    });
  }

  for (const attr of userAttributes || []) {
    const opt = attrOptions.find((o) => o.value === attr);
    auditors.push({
      userId: null,
      roleId: null,
      userAttribute: attr,
      showText: opt ? opt.label : String(attr),
    });
  }

  return auditors;
}

/** UI optType (string) -> API ShouldBe */
const optTypeToShouldBeMap = {
  1: 4,
  2: 6,
  3: 5,
  4: 8,
  5: 7,
  6: 4,
};

const shouldBeToOptTypeMap = {
  4: '1',
  6: '2',
  5: '3',
  8: '4',
  7: '5',
};

export function optTypeToShouldBe(optType) {
  const k = String(optType);
  return optTypeToShouldBeMap[k] != null ? optTypeToShouldBeMap[k] : 8;
}

export function shouldBeToOptType(shouldBe) {
  return shouldBeToOptTypeMap[shouldBe] != null
    ? shouldBeToOptTypeMap[shouldBe]
    : '4';
}

/**
 * API auditors -> UI nodeUserList + settype
 */
export function auditorsToUiApprovers(auditors) {
  if (!auditors || !auditors.length) {
    return { settype: 1, nodeUserList: [], examineMode: 1, noHanderAction: 2 };
  }
  const list = auditors.map((a) => {
    if (a.userId != null) {
      return {
        targetId: a.userId,
        type: 1,
        name: a.showText || String(a.userId),
        userAttribute: a.userAttribute,
      };
    }
    if (a.roleId != null) {
      return {
        targetId: a.roleId,
        type: 2,
        name: a.showText || String(a.roleId),
        userAttribute: a.userAttribute,
      };
    }
    return {
      targetId: 0,
      type: 1,
      name: a.showText || '属性',
      userAttribute: a.userAttribute,
    };
  });
  return {
    settype: 1,
    nodeUserList: list,
    examineMode: 1,
    noHanderAction: 2,
    directorLevel: 1,
    selectMode: 1,
    selectRange: 1,
    examineEndDirectorLevel: 0,
  };
}

/**
 * UI approver/copy node -> API auditors
 */
export function uiNodeUserListToAuditors(node) {
  const list = node.nodeUserList || [];
  return list.map((u) => {
    const auditor = {
      userId:
        u.type === 2 ? null : u.targetId != null ? Number(u.targetId) : null,
      roleId:
        u.type === 2 ? (u.targetId != null ? Number(u.targetId) : null) : null,
      userAttribute: u.userAttribute != null ? u.userAttribute : 0,
      showText: u.name || '',
    };
    return auditor;
  });
}

function apiNodeToUiNode(apiNode) {
  const t = inferUiTypeFromApiNode(apiNode);
  const base = {
    id: apiNode.id,
    nodeName: apiNode.nodeName || '',
    type: t,
    priorityLevel: '',
    settype: '',
    selectMode: '',
    selectRange: '',
    directorLevel: '',
    examineMode: '',
    noHanderAction: '',
    examineEndDirectorLevel: '',
    ccSelfSelectFlag: '',
    conditionList: [],
    nodeUserList: [],
    childNode: null,
    conditionNodes: [],
    error: false,
  };

  if (t === 0) {
    return base;
  }
  if (t === 1) {
    const merged = mergeAuditorsForDisplay(apiNode.auditors);
    const pm = apiNode.passMethod != null ? apiNode.passMethod : 0;
    const pmLabel = passMethodLabelMap[pm] || '';
    const displayStr =
      pm === 0
        ? pmLabel
        : pmLabel && merged.displayStr
          ? `[${pmLabel}] ${merged.displayStr}`
          : pmLabel || merged.displayStr;
    return {
      ...base,
      passMethod: pm,
      auditors: apiNode.auditors || [],
      _displayStr: displayStr,
      examineMode: passMethodToExamineMode(pm),
      settype: 1,
      nodeUserList: [],
      error: false,
    };
  }
  if (t === 2) {
    return {
      ...base,
      nodeUserList: (apiNode.auditors || []).map((a) => ({
        targetId: a.userId || a.roleId || 0,
        type: a.roleId != null ? 2 : 1,
        name: a.showText || '',
      })),
      ccSelfSelectFlag: 1,
      error: false,
    };
  }
  return base;
}

function inferUiTypeFromApiNode(apiNode) {
  if (apiNode._uiType != null) return apiNode._uiType;
  const name = (apiNode.nodeName || '').trim();
  if (name === '发起人' || name.includes('发起')) return 0;
  if (name.includes('抄送')) return 2;
  return 1;
}

function ensureUiNodeIds(node, assignId) {
  if (!node) return;
  if (!node.id) node.id = assignId();
  if (node.type === 4 && node.conditionNodes) {
    node.conditionNodes.forEach((c) => {
      ensureUiNodeIds(c, assignId);
      ensureUiNodeIds(c.childNode, assignId);
    });
  }
  ensureUiNodeIds(node.childNode, assignId);
}

/** 仅给 type 0/1/2 节点补全 id，保存前调用 */
export function ensureAllRealNodeIds(root, assignId = generateUUID) {
  if (!root) return;
  if (root.type < 3 && !root.id) root.id = assignId();
  if (root.type === 4 && root.conditionNodes) {
    root.conditionNodes.forEach((c) => {
      ensureAllRealNodeIds(c.childNode, assignId);
    });
  }
  ensureAllRealNodeIds(root.childNode, assignId);
}

/**
 * API transition conditions -> UI conditionList
 * Now directly maps to the API format: { isOr, taskTypeCondition, shouldBe, value, valueText }
 */
export function apiConditionsToUi(conditionArr) {
  if (!conditionArr || !conditionArr.length) return [];
  return conditionArr.map((c) => ({
    isOr: c.isOr === true || c.isOr === 1,
    taskTypeCondition: c.taskTypeCondition,
    shouldBe: c.shouldBe,
    value:
      c.value != null
        ? isNaN(Number(c.value))
          ? c.value
          : Number(c.value)
        : undefined,
    valueText: c.valueText || '',
  }));
}

/**
 * UI conditionList -> API conditions
 * Now the UI format matches API directly
 */
export function uiConditionsToApi(conditionList, nodeUserList) {
  if (!conditionList || !conditionList.length) return [];
  return conditionList
    .filter((item) => item.taskTypeCondition != null && item.shouldBe != null)
    .map((item, i) => ({
      isOr: i === 0 ? false : item.isOr === true || item.isOr === 1,
      taskTypeCondition: item.taskTypeCondition,
      shouldBe: item.shouldBe,
      value: item.value != null ? String(item.value) : null,
      valueText: item.valueText || null,
    }));
}

function groupBySrc(transitions) {
  const map = new Map();
  for (const t of transitions || []) {
    const key = t.srcNodeId == null ? '__null__' : t.srcNodeId;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }
  return map;
}

function isEmptyConditions(t) {
  return !t.conditions || t.conditions.length === 0;
}

/**
 * 从多个分支头出发，在全图上做 BFS 可达集，求交集，取距起点最近的公共汇合点
 */
function findMergeFromBranchHeads(heads, edgeMap) {
  if (heads.length < 2) return null;
  function reachable(start) {
    const R = new Set();
    const q = [start];
    while (q.length) {
      const u = q.shift();
      if (R.has(u)) continue;
      R.add(u);
      const outs = edgeMap.get(u) || [];
      for (const e of outs) {
        if (e.tgtNodeId) q.push(e.tgtNodeId);
      }
    }
    return R;
  }
  let common = reachable(heads[0]);
  for (let i = 1; i < heads.length; i++) {
    const Ri = reachable(heads[i]);
    common = new Set([...common].filter((x) => Ri.has(x)));
  }
  heads.forEach((h) => common.delete(h));
  if (common.size === 0) return null;
  const dist = new Map();
  let q = heads.map((h) => ({ id: h, d: 0 }));
  while (q.length) {
    const { id, d } = q.shift();
    if (dist.has(id)) continue;
    dist.set(id, d);
    for (const e of edgeMap.get(id) || []) {
      if (e.tgtNodeId) q.push({ id: e.tgtNodeId, d: d + 1 });
    }
  }
  let best = null;
  let bestD = Infinity;
  for (const id of common) {
    const d0 = dist.get(id);
    if (d0 != null && d0 < bestD) {
      bestD = d0;
      best = id;
    }
  }
  return best;
}

function defaultRouterShell() {
  return {
    nodeName: '路由',
    type: 4,
    priorityLevel: 1,
    settype: 1,
    selectMode: 0,
    selectRange: 0,
    directorLevel: 1,
    examineMode: 1,
    noHanderAction: 2,
    examineEndDirectorLevel: 1,
    ccSelfSelectFlag: 1,
    conditionList: [],
    nodeUserList: [],
    childNode: null,
    conditionNodes: [],
  };
}

/**
 * @param {object} detail WorkFlowDetailDto
 * @returns {{ nodeConfig: object, meta: object }}
 */
export function flatToTree(detail) {
  const nodes = detail.nodes || [];
  const transitions = detail.transitions || [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap = groupBySrc(transitions);
  const chainMemo = new Map();
  const subMemo = new Map();

  const nullEdges = edgeMap.get('__null__') || [];
  const meta = {
    id: detail.id || null,
    name: detail.name || '',
    taskType: detail.taskType ?? 0,
    enable: detail.enable !== false,
  };
  if (!nullEdges.length) {
    const root = defaultPromoterNode();
    root.id = generateUUID();
    return { nodeConfig: root, meta };
  }
  const rootId = nullEdges[0].tgtNodeId;

  function outgoing(nodeId) {
    return (edgeMap.get(nodeId) || [])
      .slice()
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  function buildForkAt(nodeId, stopId) {
    const outs = outgoing(nodeId).filter(
      (e) => e.tgtNodeId == null || e.tgtNodeId !== stopId,
    );
    if (!outs.length) return null;
    const heads = outs.map((o) => o.tgtNodeId);
    const mergeId =
      heads.length > 1 ? findMergeFromBranchHeads(heads, edgeMap) : stopId;

    const router = defaultRouterShell();

    outs.forEach((edge, idx) => {
      const isLast = idx === outs.length - 1;
      const edgeIsDefault = edge.isDefault === true;
      const condNode = {
        nodeName: `条件${idx + 1}`,
        type: 3,
        priorityLevel: edge.priority != null ? edge.priority : idx + 1,
        isDefault: edgeIsDefault,
        settype: 1,
        selectMode: 0,
        selectRange: 0,
        directorLevel: 1,
        examineMode: 1,
        noHanderAction: 2,
        examineEndDirectorLevel: 1,
        ccSelfSelectFlag: 1,
        conditionList: edgeIsDefault
          ? []
          : apiConditionsToUi(edge.conditions || []),
        nodeUserList: [],
        childNode: null,
        conditionNodes: [],
        error: false,
        _conditionDisplayStr: edgeIsDefault ? '默认路径' : '',
      };

      const h = edge.tgtNodeId;
      if (mergeId && h !== mergeId) {
        condNode.childNode = buildChain(h, mergeId);
      } else if (!mergeId) {
        condNode.childNode = buildSubTree(h);
      } else {
        condNode.childNode = null;
      }

      condNode.error =
        !edgeIsDefault &&
        condNode.conditionList.length === 0 &&
        !isLast &&
        !isEmptyConditions(edge);

      router.conditionNodes.push(condNode);
    });

    router.childNode = mergeId ? buildSubTree(mergeId) : null;
    return router;
  }

  function buildChain(startId, stopId) {
    if (!startId || startId === stopId) return null;
    const key = `${startId}_${stopId || 'end'}`;
    if (chainMemo.has(key)) return chainMemo.get(key);

    const apiNode = nodeMap.get(startId);
    if (!apiNode) {
      chainMemo.set(key, null);
      return null;
    }
    const uiNode = apiNodeToUiNode(apiNode);
    const outs = outgoing(startId).filter(
      (e) => e.tgtNodeId == null || e.tgtNodeId !== stopId,
    );

    if (!outs.length) {
      uiNode.childNode = null;
      chainMemo.set(key, uiNode);
      return uiNode;
    }

    if (outs.length > 1) {
      uiNode.childNode = buildForkAt(startId, stopId);
      chainMemo.set(key, uiNode);
      return uiNode;
    }

    const e = outs[0];
    if (!isEmptyConditions(e)) {
      uiNode.childNode = buildForkAt(startId, stopId);
      chainMemo.set(key, uiNode);
      return uiNode;
    }

    const nextId = e.tgtNodeId;
    if (nextId === stopId) {
      uiNode.childNode = null;
      chainMemo.set(key, uiNode);
      return uiNode;
    }

    uiNode.childNode = buildChain(nextId, stopId);
    chainMemo.set(key, uiNode);
    return uiNode;
  }

  function buildSubTree(nodeId) {
    if (!nodeId) return null;
    if (subMemo.has(nodeId)) return subMemo.get(nodeId);

    const apiNode = nodeMap.get(nodeId);
    if (!apiNode) {
      subMemo.set(nodeId, null);
      return null;
    }
    const uiNode = apiNodeToUiNode(apiNode);
    const outs = outgoing(nodeId);

    if (!outs.length) {
      uiNode.childNode = null;
      subMemo.set(nodeId, uiNode);
      return uiNode;
    }

    if (outs.length === 1 && isEmptyConditions(outs[0])) {
      uiNode.childNode = buildSubTree(outs[0].tgtNodeId);
      subMemo.set(nodeId, uiNode);
      return uiNode;
    }

    uiNode.childNode = buildForkAt(nodeId, null);
    subMemo.set(nodeId, uiNode);
    return uiNode;
  }

  if (nullEdges.length === 1 && isEmptyConditions(nullEdges[0])) {
    const nodeConfig = buildSubTree(rootId);
    ensureUiNodeIds(nodeConfig, generateUUID);
    return { nodeConfig, meta };
  }

  if (nullEdges.length === 1 && !isEmptyConditions(nullEdges[0])) {
    const edge = nullEdges[0];
    const router = defaultRouterShell();

    const condNode = {
      nodeName: '条件1',
      type: 3,
      priorityLevel: edge.priority != null ? edge.priority : 1,
      isDefault: false,
      settype: 1,
      selectMode: 0,
      selectRange: 0,
      directorLevel: 1,
      examineMode: 1,
      noHanderAction: 2,
      examineEndDirectorLevel: 1,
      ccSelfSelectFlag: 1,
      conditionList: apiConditionsToUi(edge.conditions || []),
      nodeUserList: [],
      childNode: buildSubTree(edge.tgtNodeId),
      conditionNodes: [],
      error: false,
      _conditionDisplayStr: '',
    };

    const defaultCondNode = {
      nodeName: '默认条件',
      type: 3,
      priorityLevel: 2,
      isDefault: true,
      settype: 1,
      selectMode: 0,
      selectRange: 0,
      directorLevel: 1,
      examineMode: 1,
      noHanderAction: 2,
      examineEndDirectorLevel: 1,
      ccSelfSelectFlag: 1,
      conditionList: [],
      nodeUserList: [],
      childNode: null,
      conditionNodes: [],
      error: false,
      _conditionDisplayStr: '默认路径',
    };

    router.conditionNodes.push(condNode, defaultCondNode);
    router.childNode = null;
    ensureUiNodeIds(router, generateUUID);
    return { nodeConfig: router, meta };
  }

  const router = defaultRouterShell();
  const realHeads = nullEdges
    .map((e) => e.tgtNodeId)
    .filter((id) => id != null);
  const mergeId =
    realHeads.length > 1 ? findMergeFromBranchHeads(realHeads, edgeMap) : null;

  const hasDefault = nullEdges.some((e) => e.isDefault === true);
  let condIdx = 0;

  nullEdges.forEach((edge) => {
    const edgeIsDefault = edge.isDefault === true;
    if (!edgeIsDefault) condIdx++;
    const condNode = {
      nodeName: edgeIsDefault ? '默认条件' : `条件${condIdx}`,
      type: 3,
      priorityLevel: edge.priority != null ? edge.priority : condIdx,
      isDefault: edgeIsDefault,
      settype: 1,
      selectMode: 0,
      selectRange: 0,
      directorLevel: 1,
      examineMode: 1,
      noHanderAction: 2,
      examineEndDirectorLevel: 1,
      ccSelfSelectFlag: 1,
      conditionList: edgeIsDefault
        ? []
        : apiConditionsToUi(edge.conditions || []),
      nodeUserList: [],
      childNode: null,
      conditionNodes: [],
      error: false,
      _conditionDisplayStr: edgeIsDefault ? '默认路径' : '',
    };

    const h = edge.tgtNodeId;
    if (mergeId && h !== mergeId) {
      condNode.childNode = buildChain(h, mergeId);
    } else if (!mergeId) {
      condNode.childNode = buildSubTree(h);
    }

    router.conditionNodes.push(condNode);
  });

  if (!hasDefault) {
    router.conditionNodes.push({
      nodeName: '默认条件',
      type: 3,
      priorityLevel: condIdx + 1,
      isDefault: true,
      settype: 1,
      selectMode: 0,
      selectRange: 0,
      directorLevel: 1,
      examineMode: 1,
      noHanderAction: 2,
      examineEndDirectorLevel: 1,
      ccSelfSelectFlag: 1,
      conditionList: [],
      nodeUserList: [],
      childNode: null,
      conditionNodes: [],
      error: false,
      _conditionDisplayStr: '默认路径',
    });
  }

  router.childNode = mergeId ? buildSubTree(mergeId) : null;
  ensureUiNodeIds(router, generateUUID);
  return { nodeConfig: router, meta };
}

function defaultPromoterNode() {
  return {
    nodeName: '发起人',
    type: 0,
    priorityLevel: '',
    settype: '',
    selectMode: '',
    selectRange: '',
    directorLevel: '',
    examineMode: '',
    noHanderAction: '',
    examineEndDirectorLevel: '',
    ccSelfSelectFlag: '',
    conditionList: [],
    nodeUserList: [],
    childNode: null,
    conditionNodes: [],
  };
}

function uiNodeToApiNode(uiNode) {
  const base = {
    id: uiNode.id,
    nodeName: uiNode.nodeName,
  };
  if (uiNode.type === 0) {
    return { ...base, passMethod: 0, auditors: [] };
  }
  if (uiNode.type === 1) {
    const pm =
      uiNode.passMethod != null
        ? uiNode.passMethod
        : examineModeToPassMethod(uiNode.examineMode);
    const auditors =
      Array.isArray(uiNode.auditors) && uiNode.auditors.length > 0
        ? uiNode.auditors
        : uiNodeUserListToAuditors(uiNode);
    return { ...base, passMethod: pm, auditors };
  }
  if (uiNode.type === 2) {
    return {
      ...base,
      passMethod: 0,
      auditors: uiNodeUserListToAuditors(uiNode),
    };
  }
  return {
    ...base,
    passMethod: examineModeToPassMethod(uiNode.examineMode),
    auditors: uiNodeUserListToAuditors(uiNode),
  };
}

/**
 * @param {object} root UI nodeConfig
 * @param {object} meta { id, name, taskType, enable }
 */
export function treeToFlat(root, meta = {}) {
  ensureAllRealNodeIds(root);

  const nodes = [];
  const transitions = [];
  const seenNodeIds = new Set();

  function pushNode(ui) {
    if (!ui || ui.type >= 3) return;
    if (seenNodeIds.has(ui.id)) return;
    seenNodeIds.add(ui.id);
    nodes.push(uiNodeToApiNode(ui));
  }

  function walkBranchToMerge(node, mergeNode) {
    if (!node) return;
    pushNode(node);
    if (!node.childNode) {
      if (mergeNode) {
        transitions.push({
          srcNodeId: node.id,
          tgtNodeId: mergeNode.id,
          priority: 0,
          isDefault: true,
          conditions: null,
        });
      }
      return;
    }
    if (mergeNode && node.childNode.id === mergeNode.id) {
      transitions.push({
        srcNodeId: node.id,
        tgtNodeId: mergeNode.id,
        priority: 0,
        isDefault: true,
        conditions: null,
      });
      return;
    }
    if (node.childNode.type === 4) {
      handleRouter(node, node.childNode, mergeNode);
      return;
    }
    transitions.push({
      srcNodeId: node.id,
      tgtNodeId: node.childNode.id,
      priority: 0,
      isDefault: true,
      conditions: null,
    });
    walkBranchToMerge(node.childNode, mergeNode);
  }

  function handleRouter(parentReal, router, inheritedMerge) {
    const merge = inheritedMerge != null ? inheritedMerge : router.childNode;
    const branches = router.conditionNodes || [];

    branches.forEach((cond, idx) => {
      const isLast = idx === branches.length - 1;
      const condIsDefault =
        cond.isDefault === true ||
        (isLast && !branches.some((b) => b.isDefault === true));
      const sub = cond.childNode;
      const conditions = condIsDefault
        ? null
        : uiConditionsToApi(cond.conditionList, cond.nodeUserList);
      const priority =
        cond.priorityLevel != null ? cond.priorityLevel : idx + 1;

      if (sub) {
        transitions.push({
          srcNodeId: parentReal.id,
          tgtNodeId: sub.id,
          priority,
          isDefault: condIsDefault,
          conditions,
        });
        walkBranchToMerge(sub, merge);
      } else if (merge) {
        transitions.push({
          srcNodeId: parentReal.id,
          tgtNodeId: merge.id,
          priority,
          isDefault: condIsDefault,
          conditions,
        });
      } else {
        transitions.push({
          srcNodeId: parentReal.id,
          tgtNodeId: null,
          priority,
          isDefault: condIsDefault,
          conditions: condIsDefault ? null : conditions,
        });
      }
    });

    if (merge && branches.length === 0) {
      walk(merge);
    } else if (merge && !inheritedMerge) {
      walk(merge);
    }
  }

  function walk(uiNode) {
    if (!uiNode) return;
    if (uiNode.type >= 3) return;

    pushNode(uiNode);

    if (!uiNode.childNode) return;

    if (uiNode.childNode.type === 4) {
      handleRouter(uiNode, uiNode.childNode, null);
      return;
    }

    transitions.push({
      srcNodeId: uiNode.id,
      tgtNodeId: uiNode.childNode.id,
      priority: 0,
      isDefault: true,
      conditions: null,
    });
    walk(uiNode.childNode);
  }

  if (root.type === 4) {
    handleRouter({ id: null }, root, null);
  } else {
    if (!root.id) root.id = generateUUID();
    pushNode(root);

    transitions.push({
      srcNodeId: null,
      tgtNodeId: root.id,
      priority: 0,
      isDefault: true,
      conditions: null,
    });

    walk(root);
  }

  const editDto = {
    id: meta.id != null ? meta.id : null,
    name: meta.name != null ? meta.name : '',
    taskType: meta.taskType != null ? meta.taskType : 0,
    enable: meta.enable !== false,
    nodes,
    transitions,
  };

  return editDto;
}

/**
 * 用于测试：规范化 transitions（排序）便于比较
 */
export function normalizeFlatForCompare(dto) {
  const t = (dto.transitions || []).map((x) => ({ ...x }));
  t.sort(
    (a, b) =>
      String(a.srcNodeId).localeCompare(String(b.srcNodeId)) ||
      (a.priority || 0) - (b.priority || 0),
  );
  return {
    ...dto,
    transitions: t,
    nodes: [...(dto.nodes || [])].sort((a, b) =>
      String(a.id).localeCompare(String(b.id)),
    ),
  };
}
