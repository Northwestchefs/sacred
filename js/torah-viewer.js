import { getLinks, getText } from './sefaria-api.js';
import { mapVerseToSefirot } from './sefirot-map.js';

function flattenText(text) {
  if (Array.isArray(text)) {
    return text.flat(Infinity).filter(Boolean).join(' ');
  }

  return String(text || '').trim();
}

function renderLinks(container, links) {
  if (!container) return;

  if (!Array.isArray(links) || links.length === 0) {
    container.innerHTML = '<li>No linked commentaries were found for this reference.</li>';
    return;
  }

  container.innerHTML = links
    .slice(0, 12)
    .map((link) => {
      const sourceRef = link.ref || 'Related source';
      const type = link.type ? ` (${link.type})` : '';
      return `<li>${sourceRef}${type}</li>`;
    })
    .join('');
}

export function initTorahViewer(root = document) {
  const form = root.getElementById('verse-viewer-form');
  const refInput = root.getElementById('verse-reference-input');
  const status = root.getElementById('verse-viewer-status');
  const hebrew = root.getElementById('verse-hebrew-text');
  const english = root.getElementById('verse-english-text');
  const linksContainer = root.getElementById('verse-commentary-links');

  if (!form || !refInput || !status) return;

  async function loadReference(ref) {
    status.textContent = `Loading ${ref}…`;
    try {
      const [textPayload, linksPayload] = await Promise.all([getText(ref), getLinks(ref)]);

      const hebrewText = flattenText(textPayload?.versions?.[0]?.text?.he || textPayload?.he || textPayload?.hebrew);
      const englishText = flattenText(textPayload?.versions?.[0]?.text?.en || textPayload?.text || textPayload?.en);

      if (hebrew) hebrew.textContent = hebrewText || 'Hebrew text unavailable for this reference.';
      if (english) english.textContent = englishText || 'English translation unavailable for this reference.';

      renderLinks(linksContainer, linksPayload);

      const sefirahHints = mapVerseToSefirot(`${englishText} ${hebrewText}`);
      status.textContent = `Loaded ${ref}. Sefirot resonance: ${sefirahHints.join(', ')}.`;

      root.dispatchEvent(
        new CustomEvent('verse:loaded', {
          detail: {
            ref,
            hebrewText,
            englishText,
            links: linksPayload,
            sefirahHints,
          },
        }),
      );
    } catch (error) {
      status.textContent = `Unable to load ${ref}: ${error.message}`;
      if (hebrew) hebrew.textContent = '';
      if (english) english.textContent = '';
      if (linksContainer) linksContainer.innerHTML = '';
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const ref = refInput.value.trim();
    if (!ref) {
      status.textContent = 'Enter a valid reference to begin.';
      return;
    }

    loadReference(ref);
  });

  const defaultRef = refInput.value.trim();
  if (defaultRef) loadReference(defaultRef);
}
