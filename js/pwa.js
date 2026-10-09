/* ============================================================
 * 珊屿蝶梦🦋 PWA 辅助脚本
 * 能力：注册 Service Worker、通知权限引导、悬浮通知入口
 * 仅新增 PWA 相关能力，不修改站点原有逻辑
 * ============================================================ */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) { return; }

  var SW_URL = 'sw.js';

  /* 注册 Service Worker：后台保活与通知能力的基础 */
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(SW_URL).catch(function (err) {
      console.warn('[PWA] Service Worker 注册失败:', err);
    });
  });

  /* 悬浮通知入口：页面任意逻辑调用 PWANotify(title, body, tag) 即可弹系统通知 */
  window.PWANotify = function (title, body, tag) {
    if (!('Notification' in window)) {
      console.warn('[PWA] 当前浏览器不支持 Notification API');
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') { doNotify(title, body, tag); }
      });
      return;
    }
    if (Notification.permission === 'granted') { doNotify(title, body, tag); }
  };

  function doNotify(title, body, tag) {
    var opt = {
      body: body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: tag || 'rafayel-notify',
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'notify', title: title || '珊屿蝶梦', body: body || '', tag: tag || 'rafayel-notify'
      });
      return;
    }
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification(title || '珊屿蝶梦', opt);
      });
      return;
    }
    try { new Notification(title || '珊屿蝶梦', opt); } catch (e) { /* 忽略 */ }
  }

  /* 首次访问时的极简通知授权引导（仅提示一次，拒绝后不再出现） */
  function initPermissionBanner() {
    if (!('Notification' in window)) { return; }
    if (Notification.permission !== 'default') { return; }
    if (window.sessionStorage.getItem('pwa-notify-banner-closed')) { return; }

    var bar = document.createElement('div');
    bar.id = 'pwa-notify-banner';
    bar.setAttribute('style',
      'position:fixed;right:12px;bottom:24px;z-index:2147483647;' +
      'background:rgba(20,20,30,.85);color:#fff;' +
      'font:12px/1.4 system-ui,-apple-system,sans-serif;' +
      'padding:8px 14px;border-radius:18px;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.3);' +
      'display:none;align-items:center;gap:10px;cursor:pointer;' +
      'user-select:none;max-width:72vw;'
    );
    var label = document.createElement('span');
    label.textContent = '开启通知，消息可悬浮提醒';
    var close = document.createElement('span');
    close.textContent = '\u00d7';
    close.setAttribute('style', 'opacity:.6;font-size:14px;padding:0 2px;');
    bar.appendChild(label);
    bar.appendChild(close);
    document.body.appendChild(bar);

    close.addEventListener('click', function (e) {
      e.stopPropagation();
      if (bar.parentNode) { bar.parentNode.removeChild(bar); }
      window.sessionStorage.setItem('pwa-notify-banner-closed', '1');
    });
    bar.addEventListener('click', function () {
      Notification.requestPermission().then(function () {
        if (bar.parentNode) { bar.parentNode.removeChild(bar); }
        window.sessionStorage.setItem('pwa-notify-banner-closed', '1');
      });
    });

    /* 延迟出现，避免遮挡首屏操作 */
    setTimeout(function () { bar.style.display = 'flex'; }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPermissionBanner);
  } else {
    initPermissionBanner();
  }
})();
