let manager: UniNamespace.UpdateManager | null = null;
let listenersBound = false;
let updateReady = false;
let promptVisible = false;

function toast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function getManager() {
  manager ??= uni.getUpdateManager();
  return manager;
}

function promptRestart() {
  if (!updateReady || promptVisible) return;

  const updateManager = getManager();
  promptVisible = true;
  uni.showModal({
    title: '更新提示',
    content: '新版本已经准备好，是否重启应用？',
    confirmText: '立即重启',
    cancelText: '稍后',
    success: (res) => {
      if (res.confirm) updateManager.applyUpdate();
    },
    complete: () => {
      promptVisible = false;
    },
  });
}

function bindListeners() {
  if (listenersBound) return;

  const updateManager = getManager();
  listenersBound = true;

  updateManager.onUpdateReady(() => {
    updateReady = true;
    promptRestart();
  });

  updateManager.onUpdateFailed(() => {
    toast('新版本下载失败，请稍后重试');
  });
}

/** 尽早绑定更新管理器，以便赶上冷启动时微信自己发起的版本检查。 */
export function setupAutoUpdateCheck() {
  try {
    bindListeners();
  } catch {
    // 非微信小程序运行时没有更新管理器，静默跳过
  }
}

/**
 * 冷启动与从后台回到前台时调用。
 * 微信没有主动 checkForUpdate API，检查由客户端自动发起；
 * 若新版本已下载完成，再次弹出重启确认，由用户决定是否应用。
 */
export function checkUpdateOnAppShow() {
  setupAutoUpdateCheck();
  if (updateReady) promptRestart();
}
