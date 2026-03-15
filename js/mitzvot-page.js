import { initMitzvotDashboard } from '../components/mitzvot-dashboard.js';

initMitzvotDashboard('#mitzvot-dashboard-slot', {
  onViewVerse: (reference, mitzvah) => {
    if (!reference) return;

    if (typeof window.trackEvent === 'function') {
      window.trackEvent('mitzvah_view', {
        mitzvah_number: mitzvah?.id ?? null,
      });
    }

    const params = new URLSearchParams({ reference });
    window.location.href = `../hebrew-bible/?${params.toString()}`;
  },
}).catch((error) => {
  const slot = document.querySelector('#mitzvot-dashboard-slot');
  if (!slot) return;
  slot.innerHTML = `<p class="reader-status">Unable to load mitzvot dashboard: ${error.message}</p>`;
});
