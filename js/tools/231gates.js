const HEBREW_ALPHABET = [...'אבגדהוזחטיכלמנסעפצקרשת'];

export function generate231Gates() {
  const gates = [];

  for (let i = 0; i < HEBREW_ALPHABET.length; i += 1) {
    for (let j = i + 1; j < HEBREW_ALPHABET.length; j += 1) {
      gates.push(`${HEBREW_ALPHABET[i]}${HEBREW_ALPHABET[j]}`);
    }
  }

  return gates;
}

export { HEBREW_ALPHABET };
