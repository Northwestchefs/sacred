function formatBookLabel(book) {
  const english = book.bookEnglish || book.book || book.slug;
  const hebrew = book.bookHebrew;

  if (hebrew && hebrew !== english) {
    return `${english} · ${hebrew}`;
  }

  return english;
}

function renderBookOptions(selectElement, books, selectedBookSlug) {
  selectElement.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = books.length ? 'Select a book' : 'No books available';
  placeholderOption.disabled = true;
  placeholderOption.selected = !selectedBookSlug;
  selectElement.appendChild(placeholderOption);

  for (const book of books) {
    const option = document.createElement('option');
    option.value = book.slug;
    option.textContent = formatBookLabel(book);

    if (book.slug === selectedBookSlug) {
      option.selected = true;
    }

    selectElement.appendChild(option);
  }

  selectElement.disabled = books.length === 0;
}

function renderChapterOptions(selectElement, chapters, selectedChapter) {
  selectElement.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = chapters.length ? 'Select a chapter' : 'Select a book first';
  placeholderOption.disabled = true;
  placeholderOption.selected = !selectedChapter;
  selectElement.appendChild(placeholderOption);

  for (const chapterInfo of chapters) {
    const option = document.createElement('option');
    option.value = String(chapterInfo.chapter);
    option.textContent = `Chapter ${chapterInfo.chapter}`;

    if (chapterInfo.chapter === selectedChapter) {
      option.selected = true;
    }

    selectElement.appendChild(option);
  }

  selectElement.disabled = chapters.length === 0;
}

function getHebrewText(verse) {
  return verse.hebrew ?? verse.textHebrew ?? verse.text ?? '';
}

function renderVerses(listElement, verses, highlightedVerse = null) {
  listElement.innerHTML = '';

  for (const verse of verses) {
    const verseElement = document.createElement('li');
    verseElement.className = 'verse-row';
    verseElement.dataset.verse = String(verse.verse);

    if (highlightedVerse && Number(verse.verse) === Number(highlightedVerse)) {
      verseElement.classList.add('verse-row--target');
    }

    const verseNumber = document.createElement('span');
    verseNumber.className = 'verse-number';
    verseNumber.textContent = String(verse.verse);

    const verseText = document.createElement('p');
    verseText.className = 'verse-text';
    verseText.setAttribute('dir', 'rtl');
    verseText.setAttribute('lang', 'he');
    verseText.textContent = getHebrewText(verse);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'verse-copy-button';
    copyButton.dataset.copyVerse = String(verse.verse);
    copyButton.textContent = 'Copy';

    verseElement.append(verseNumber, verseText, copyButton);
    listElement.appendChild(verseElement);
  }
}

function renderSearchResults(listElement, results) {
  listElement.innerHTML = '';

  if (!results.length) {
    return;
  }

  for (const result of results) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-button';
    button.dataset.book = result.bookSlug;
    button.dataset.chapter = String(result.chapter);
    button.dataset.verse = String(result.verse || '');

    const ref = document.createElement('span');
    ref.className = 'result-reference';
    ref.textContent = `${result.bookEnglish || result.bookSlug} ${result.chapter}:${result.verse}`;

    const text = document.createElement('span');
    text.className = 'result-text';
    text.dir = 'rtl';
    text.lang = 'he';
    text.textContent = result.text;

    button.append(ref, text);
    item.appendChild(button);
    listElement.appendChild(item);
  }
}

function renderStatus(statusElement, message, kind = 'neutral') {
  statusElement.textContent = message || '';
  statusElement.dataset.kind = kind;
}

function updateHeaderMeta({
  referenceElement,
  progressElement,
  reference,
  currentVerse = null,
  verseCount = 0,
}) {
  referenceElement.textContent = reference || 'Ready to begin';

  if (!verseCount) {
    progressElement.textContent = '0 / 0 verses visible';
    return;
  }

  const current = Number(currentVerse) || 0;

  if (!current) {
    progressElement.textContent = `${verseCount} verses in this chapter`;
    return;
  }

  progressElement.textContent = `Verse ${current} of ${verseCount}`;
}

export {
  renderBookOptions,
  renderChapterOptions,
  renderVerses,
  renderSearchResults,
  renderStatus,
  updateHeaderMeta,
};
