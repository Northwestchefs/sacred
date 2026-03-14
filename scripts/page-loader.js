import { SITE_VERSION } from './siteVersion.js';

const versioned = (path) => `${path}?v=${encodeURIComponent(SITE_VERSION)}`;

async function runCacheBustReloadCheck() {
  const cacheKey = `sacred:page-fingerprint:${location.pathname}`;
  const reloadKey = `sacred:reload-guard:${location.pathname}`;

  try {
    const checkUrl = new URL(location.href);
    checkUrl.searchParams.set('__cacheCheck', String(Date.now()));

    const response = await fetch(checkUrl.toString(), {
      method: 'HEAD',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) return;

    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    const fingerprint = etag || lastModified;

    if (!fingerprint) return;

    const previousFingerprint = sessionStorage.getItem(cacheKey);
    if (previousFingerprint && previousFingerprint !== fingerprint) {
      if (sessionStorage.getItem(reloadKey) === '1') {
        sessionStorage.removeItem(reloadKey);
      } else {
        sessionStorage.setItem(cacheKey, fingerprint);
        sessionStorage.setItem(reloadKey, '1');
        location.reload();
        return;
      }
    }

    sessionStorage.setItem(cacheKey, fingerprint);
    sessionStorage.removeItem(reloadKey);
  } catch (_error) {
    // Ignore network/header limitations and continue normal boot.
  }
}

async function loadPageScripts() {
  await import(versioned('../assets/js/main.js'));

  if (document.body?.dataset?.page === 'study') {
    await import(versioned('../js/sacred-study.js'));
  }

  if (document.body?.dataset?.page === 'messiah') {
    await import(versioned('../js/messiah-page.js'));
  }
}

(async function bootstrap() {
  await runCacheBustReloadCheck();
  await loadPageScripts();
})();

export { versioned };
