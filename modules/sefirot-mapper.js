const NAME_TO_SEFIROT = {
  אהיה: ['Keter'],
  יה: ['Chokhmah'],
  'יהוה אלוהים': ['Binah'],
  אל: ['Chesed'],
  אלוהים: ['Gevurah'],
  יהוה: ['Tiferet'],
  צבאות: ['Netzach'],
  'אלוהים צבאות': ['Hod'],
  שדי: ['Yesod'],
  אדני: ['Malkhut'],
};

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

export function mapToSefirot(divineNameAnalysis = {}, gematriaAnalysis = {}) {
  const detected = divineNameAnalysis?.namesDetected || [];
  const mappedFromNames = detected.flatMap((name) => NAME_TO_SEFIROT[name] || []);
  const mapped = unique(mappedFromNames);

  const primarySefirah = mapped[0] || (Number(gematriaAnalysis?.total || 0) % 2 === 0 ? 'Tiferet' : 'Malkhut');
  const secondarySefirot = mapped.slice(1);

  const confidenceBase = detected.length ? 0.65 : 0.35;
  const confidenceBonus = Math.min(detected.length * 0.1, 0.3);

  return {
    primarySefirah,
    secondarySefirot,
    confidenceScore: Number((confidenceBase + confidenceBonus).toFixed(2)),
  };
}

export { NAME_TO_SEFIROT };
