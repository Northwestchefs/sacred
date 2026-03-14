export function renderMitzvahCard(mitzvah, options = {}) {
  const card = document.createElement('article');
  card.className = 'mitzvah-card';
  card.setAttribute('role', 'listitem');

  const {
    id = '—',
    title = 'Untitled mitzvah',
    hebrew = '',
    category = 'Uncategorized',
    type = '—',
    torahSource = 'Unknown source',
    description = 'No description available.',
  } = mitzvah || {};

  card.innerHTML = `
    <p class="mitzvah-number">Mitzvah #${id}</p>
    <h3>${title}</h3>
    <p class="mitzvah-hebrew">${hebrew}</p>
    <dl class="mitzvah-meta">
      <div><dt>Source:</dt><dd>${torahSource}</dd></div>
      <div><dt>Type:</dt><dd>${type} Commandment</dd></div>
      <div><dt>Category:</dt><dd>${category}</dd></div>
    </dl>
    <p>${description}</p>
    <button class="button button-secondary mitzvah-view-verse" type="button">View Verse</button>
  `;

  const viewVerseButton = card.querySelector('.mitzvah-view-verse');
  viewVerseButton?.addEventListener('click', () => {
    if (typeof options.onViewVerse === 'function') {
      options.onViewVerse(torahSource, mitzvah);
    }
  });

  return card;
}
