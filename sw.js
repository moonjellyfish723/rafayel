/* ============================================================
 * 珊屿蝶梦🦋 PWA Service Worker
 * 仅新增 PWA 能力：离线缓存兜底 + 通知悬浮显示 + 推送事件预留
 * 不改变站点原有任何行为（fetch 走网络优先，正常访问不受影响）
 * ============================================================ */
var CACHE_NAME = 'rafayel-pwa-v1';
var CORE_ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    }).catch(function () { /* 首装缓存失败不阻塞激活 */ })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* 网络优先，离线时回退缓存 —— 正常访问完全不干预，纯新增兜底能力 */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') { return; }
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    })
  );
});

/* 推送事件：预留给未来服务端 Web Push；收到即显示悬浮通知 */
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* 忽略非 JSON */ }
  var title = data.title || '珊屿蝶梦';
  var options = {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    tag: data.tag || 'rafayel-notify'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* 点击通知：聚焦已打开的窗口，否则打开站点首页 */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) { return list[i].focus(); }
      }
      return self.clients.openWindow('./index.html');
    })
  );
});

/* 页面消息：页面请求授权后，经由 SW 显示系统级悬浮通知 */
self.addEventListener('message', function (event) {
  var msg = event.data || {};
  if (msg.type === 'notify') {
    var title = msg.title || '珊屿蝶梦';
    var options = {
      body: msg.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      tag: msg.tag || 'rafayel-notify'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});
