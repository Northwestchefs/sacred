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

function renderVerses(listElement, verses) {
  listElement.innerHTML = '';

  for (const verse of verses) {
    const verseElement = document.createElement('li');
    verseElement.className = 'verse-row';

    const verseNumber = document.createElement('span');
    verseNumber.className = 'verse-number';
    verseNumber.textContent = String(verse.verse);

    const verseText = document.createElement('p');
    verseText.className = 'verse-text';
    verseText.setAttribute('dir', 'rtl');
    verseText.setAttribute('lang', 'he');
    verseText.textContent = getHebrewText(verse);

    verseElement.append(verseNumber, verseText);
    listElement.appendChild(verseElement);
  }
}

function renderStatus(statusElement, message, kind = 'neutral') {
  statusElement.textContent = message || '';
  statusElement.dataset.kind = kind;
}

export {
  renderBookOptions,
  renderChapterOptions,
  renderVerses,
  renderStatus,
};
