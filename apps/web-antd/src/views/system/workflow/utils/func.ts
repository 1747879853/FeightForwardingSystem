const func = {
  timer: null as ReturnType<typeof setTimeout> | null,

  debounce(fn: (...args: any[]) => void, delay = 500) {
    const self = this;
    return function (this: any, arg: any) {
      const that = this;
      const args = arg;
      if (self.timer) clearTimeout(self.timer);
      self.timer = setTimeout(() => {
        fn.call(that, args);
      }, delay);
    };
  },

  arrToStr(arr: any[]) {
    if (arr) {
      return arr.map((item) => item.name).toString();
    }
    return '';
  },

  toggleClass(arr: any[], elem: any, key = 'id') {
    return arr.some((item) => item[key] === elem[key]);
  },

  toChecked(arr: any[], elem: any, key = 'id') {
    const isIncludes = this.toggleClass(arr, elem, key);
    if (!isIncludes) {
      arr.push(elem);
    } else {
      this.removeEle(arr, elem, key);
    }
  },

  removeEle(arr: any[], elem: any, key = 'id') {
    let includesIndex = -1;
    arr.forEach((item, index) => {
      if (item[key] === elem[key]) {
        includesIndex = index;
      }
    });
    if (includesIndex >= 0) {
      arr.splice(includesIndex, 1);
    }
  },

  setApproverStr(nodeConfig: any) {
    if (nodeConfig._displayStr) {
      return nodeConfig._displayStr;
    }
    if (nodeConfig.settype === 1) {
      if (nodeConfig.nodeUserList.length === 1) {
        return nodeConfig.nodeUserList[0].name;
      } else if (nodeConfig.nodeUserList.length > 1) {
        if (nodeConfig.examineMode === 1) {
          return this.arrToStr(nodeConfig.nodeUserList);
        } else if (nodeConfig.examineMode === 2) {
          return `${nodeConfig.nodeUserList.length}人会签`;
        }
      }
    } else if (nodeConfig.settype === 2) {
      const level =
        nodeConfig.directorLevel === 1
          ? '直接主管'
          : `第${nodeConfig.directorLevel}级主管`;
      if (nodeConfig.examineMode === 1) {
        return level;
      } else if (nodeConfig.examineMode === 2) {
        return `${level}会签`;
      }
    } else if (nodeConfig.settype === 4) {
      if (nodeConfig.selectRange === 1) {
        return '发起人自选';
      } else {
        if (nodeConfig.nodeUserList.length > 0) {
          if (nodeConfig.selectRange === 2) {
            return '发起人自选';
          } else {
            return `发起人从${nodeConfig.nodeUserList[0].name}中自选`;
          }
        } else {
          return '';
        }
      }
    } else if (nodeConfig.settype === 5) {
      return '发起人自己';
    } else if (nodeConfig.settype === 7) {
      return `从直接主管到通讯录中级别最高的第${nodeConfig.examineEndDirectorLevel}个层级主管`;
    }
    return '';
  },

  dealStr(str: string, obj: Record<string, any>) {
    const arr: string[] = [];
    const list = str.split(',');
    for (const elem in obj) {
      list.forEach((item) => {
        if (item === elem) {
          arr.push(obj[elem].value);
        }
      });
    }
    return arr.join('或');
  },

  conditionStr(nodeConfig: any, index: number) {
    const condNode = nodeConfig.conditionNodes[index];
    const { conditionList, isDefault } = condNode;

    if (condNode._conditionDisplayStr) {
      return condNode._conditionDisplayStr;
    }

    if (isDefault === true) {
      return '默认路径';
    }

    if (!conditionList || conditionList.length === 0) {
      return index === nodeConfig.conditionNodes.length - 1 &&
        nodeConfig.conditionNodes[0].conditionList &&
        nodeConfig.conditionNodes[0].conditionList.length !== 0
        ? '其他条件进入此流程'
        : '请设置条件';
    }

    const shouldBeMap: Record<number, string> = {
      0: '是',
      1: '不是',
      2: '包含',
      3: '不包含',
      4: '<',
      5: '≤',
      6: '>',
      7: '≥',
      8: '等于',
      9: '不等于',
      10: '属于',
      11: '不属于',
    };

    const fieldMap: Record<number, string> = {
      3001: '付费申请人',
      3002: '付费申请人组织',
    };

    let result = '';
    let partCount = 0;
    for (const c of conditionList) {
      if (c.taskTypeCondition == null || c.shouldBe == null) continue;
      const fieldLabel =
        fieldMap[c.taskTypeCondition] || String(c.taskTypeCondition);
      const sbLabel = shouldBeMap[c.shouldBe] || String(c.shouldBe);
      const valText = c.valueText || c.value || '';
      if (partCount > 0) {
        const isOr = c.isOr === true || c.isOr === 1;
        result += isOr ? ' 或 ' : ' 且 ';
      }
      result += `${fieldLabel} ${sbLabel} ${valText}`;
      partCount++;
    }

    return result || '请设置条件';
  },

  copyerStr(nodeConfig: any) {
    if (nodeConfig.nodeUserList.length !== 0) {
      return this.arrToStr(nodeConfig.nodeUserList);
    } else {
      if (nodeConfig.ccSelfSelectFlag === 1) {
        return '发起人自选';
      }
    }
    return '';
  },

  toggleStrClass(item: any, key: string) {
    const a = item.zdy1 ? item.zdy1.split(',') : [];
    return a.some((i: string) => i === key);
  },
};

export default func;
