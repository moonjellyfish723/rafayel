/* ============================================================
 * 珊屿蝶梦🦋 PWA Service Worker (sw.js)
 * 部署要求（GitHub Pages）：
 *   1. sw.js 必须放在仓库根目录，与 index.html 同级；
 *      否则注册作用域会被限制在子目录，无法拦截全站请求。
 *   2. GitHub Pages 强制 HTTPS，PWA 与 Push 均要求 HTTPS。
 * ============================================================ */

const VERSION = 'v1.0.0';
const CACHE_NAME = `rafayel-pwa-${VERSION}`;

/* 预缓存核心资源（路径全部使用相对仓库根的写法，兼容子路径部署） */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ---------- 安装：预缓存 ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // 新 SW 立即接管
  );
});

/* ---------- 激活：清理旧版本缓存 ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // 立即控制所有已打开的页面
  );
});

/* ---------- 请求拦截：缓存策略 ----------
 * - 导航 / HTML 请求：网络优先，失败回退缓存（保证内容更新）
 * - 静态资源：缓存优先，失败回退网络（保证离线可用）
 * - 跨域请求（如外部图床）：不拦截
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match('./index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

/* ---------- 推送通知：收到 push 后显示悬浮通知 ---------- */
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || '珊屿蝶梦🦋';
  const options = {
    body: payload.body || '你有一条新消息',
    icon: payload.icon || './icon-192.png',
    badge: './icon-192.png',
    tag: payload.tag || 'rafayel-push',
    renotify: true,
    data: payload.url || './index.html',
    vibrate: [100, 50, 100],
    requireInteraction: false // 悬浮展示即可，无需强制驻留
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ---------- 点击通知：聚焦已有窗口，否则打开站点首页 ---------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || './index.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
