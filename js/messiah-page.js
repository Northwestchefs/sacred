import { initMessiahExplorer } from './components/messiahExplorer.js';

function initMessiahPage() {
  console.log('[messiah] Initializing Messiah page');
  initMessiahExplorer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMessiahPage, { once: true });
} else {
  initMessiahPage();
}

export { initMessiahPage };
