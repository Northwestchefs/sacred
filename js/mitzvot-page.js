import { initMitzvotDashboard } from '../components/mitzvot-dashboard.js';

initMitzvotDashboard('#mitzvot-dashboard-slot', {
  onViewVerse: (reference) => {
    if (!reference) return;
    const params = new URLSearchParams({ reference });
    window.location.href = `../hebrew-bible/?${params.toString()}`;
  },
}).catch((error) => {
  const slot = document.querySelector('#mitzvot-dashboard-slot');
  if (!slot) return;
  slot.innerHTML = `<p class="reader-status">Unable to load mitzvot dashboard: ${error.message}</p>`;
});
