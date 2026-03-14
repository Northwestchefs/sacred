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

function getEnglishText(verse) {
  const english = verse.translation ?? verse.english ?? verse.textEnglish ?? verse.text_en ?? '';

  if (!english) {
    return '';
  }

  return english === getHebrewText(verse) ? '' : english;
}

function shouldRenderHebrew(displayMode) {
  return displayMode === 'hebrew' || displayMode === 'parallel';
}

function shouldRenderEnglish(displayMode) {
  return displayMode === 'english' || displayMode === 'parallel';
}

function renderVerses(listElement, verses, highlightedVerse = null, options = {}) {
  listElement.innerHTML = '';

  const displayMode = options.displayMode || 'parallel';
  const diagnosticsByVerse = options.diagnosticsByVerse || new Map();

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

    const verseTextGroup = document.createElement('div');
    verseTextGroup.className = 'verse-text-group';

    if (shouldRenderHebrew(displayMode)) {
      const verseText = document.createElement('p');
      verseText.className = 'verse-text';
      verseText.setAttribute('dir', 'rtl');
      verseText.setAttribute('lang', 'he');
      verseText.textContent = getHebrewText(verse);
      verseTextGroup.append(verseText);
    }

    if (shouldRenderEnglish(displayMode)) {
      const englishText = getEnglishText(verse);
      const verseTranslation = document.createElement('p');
      verseTranslation.className = 'verse-translation';
      verseTranslation.setAttribute('dir', 'ltr');
      verseTranslation.setAttribute('lang', 'en');
      verseTranslation.textContent = englishText || '[No English verse for this reference]';
      if (!englishText) {
        verseTranslation.classList.add('verse-translation--missing');
      }
      verseTextGroup.append(verseTranslation);
    }

    const mismatch = diagnosticsByVerse.get(Number(verse.verse));
    if (mismatch) {
      const diagnostic = document.createElement('p');
      diagnostic.className = 'verse-diagnostic';
      diagnostic.textContent = mismatch;
      verseTextGroup.append(diagnostic);
    }

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'verse-copy-button';
    copyButton.dataset.copyVerse = String(verse.verse);
    copyButton.textContent = 'Copy';

    verseElement.append(verseNumber, verseTextGroup, copyButton);
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

    const englishText = getEnglishText(result);
    if (englishText) {
      const translation = document.createElement('span');
      translation.className = 'result-translation';
      translation.dir = 'ltr';
      translation.lang = 'en';
      translation.textContent = englishText;
      button.append(translation);
    }
    item.appendChild(button);
    listElement.appendChild(item);
  }
}


function renderSearchPagination(elements, payload = {}) {
  if (!elements) {
    return;
  }

  const {
    container,
    previousButton,
    nextButton,
    statusElement,
  } = elements;

  if (!container || !previousButton || !nextButton || !statusElement) {
    return;
  }

  const {
    totalResults = 0,
    pageSize = 25,
    currentPage = 1,
  } = payload;

  if (!totalResults || totalResults <= pageSize) {
    container.hidden = true;
    statusElement.textContent = '';
    previousButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  container.hidden = false;
  statusElement.textContent = `Page ${safePage} of ${totalPages}`;
  previousButton.disabled = safePage <= 1;
  nextButton.disabled = safePage >= totalPages;
}

function renderSearchSummary(summaryElement, payload = {}) {
  if (!summaryElement) {
    return;
  }

  const {
    query = '',
    totalResults = 0,
    scopeLabel = 'all books',
  } = payload;

  if (!query) {
    summaryElement.textContent = '';
    return;
  }

  if (!totalResults) {
    summaryElement.textContent = `No text matches for “${query}” in ${scopeLabel}.`;
    return;
  }

  summaryElement.textContent = `${totalResults} text match${totalResults === 1 ? '' : 'es'} for “${query}” in ${scopeLabel}.`;
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

function updateChapterNav({
  previousButton,
  nextButton,
  selectedChapter,
  availableChapters,
}) {
  const chapterNumbers = (availableChapters || []).map((entry) => entry.chapter).sort((a, b) => a - b);
  const currentIndex = chapterNumbers.indexOf(selectedChapter);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < chapterNumbers.length - 1;

  if (previousButton) {
    previousButton.disabled = !hasPrevious;
  }

  if (nextButton) {
    nextButton.disabled = !hasNext;
  }
}

export {
  renderBookOptions,
  renderChapterOptions,
  renderVerses,
  renderSearchResults,
  renderSearchSummary,
  renderSearchPagination,
  renderStatus,
  updateHeaderMeta,
  updateChapterNav,
};
