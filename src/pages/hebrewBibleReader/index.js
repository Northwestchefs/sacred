import { createHebrewBibleDataLayer } from '../../data/hebrewBible/index.js';
import { bindControls } from './controls.js';
import { renderBookOptions, renderChapterOptions, renderSearchResults, renderStatus, renderVerses } from './render.js';
import { createReaderState } from './state.js';
import { buildSearchIndex, runSearchQuery } from '../../search/hebrewBible/index.js';

function safeParsePositiveInteger(value) {
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function getDeepLinkState() {
  const params = new URLSearchParams(window.location.search);
  const book = params.get('book');
  const chapter = safeParsePositiveInteger(params.get('chapter'));
  const verse = safeParsePositiveInteger(params.get('verse'));

  return {
    book,
    chapter,
    verse,
  };
}

function updateDeepLink(state) {
  const url = new URL(window.location.href);

  if (state.selectedBookSlug) {
    url.searchParams.set('book', state.selectedBookSlug);
  } else {
    url.searchParams.delete('book');
  }

  if (state.selectedChapter) {
    url.searchParams.set('chapter', String(state.selectedChapter));
  } else {
    url.searchParams.delete('chapter');
  }

  if (state.selectedVerse) {
    url.searchParams.set('verse', String(state.selectedVerse));
  } else {
    url.searchParams.delete('verse');
  }

  window.history.replaceState({}, '', url);
}

function inferBasePathFromLocation() {
  const marker = '/hebrew-bible/';
  const path = window.location.pathname;
  const markerIndex = path.indexOf(marker);

  if (markerIndex <= 0) {
    return '/';
  }

  return path.slice(0, markerIndex) || '/';
}

function focusVerse(versesList, verseNumber) {
  if (!verseNumber) {
    return;
  }

  const target = versesList.querySelector(`[data-verse="${verseNumber}"]`);

  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function initializeReaderPage() {
  const bookSelect = document.querySelector('#book-select');
  const chapterSelect = document.querySelector('#chapter-select');
  const verseInput = document.querySelector('#verse-input');
  const referenceForm = document.querySelector('#reference-form');
  const referenceInput = document.querySelector('#reference-input');
  const searchForm = document.querySelector('#search-form');
  const searchInput = document.querySelector('#search-input');
  const searchResultsList = document.querySelector('#search-results');
  const versesList = document.querySelector('#verses-list');
  const statusElement = document.querySelector('#reader-status');

  const state = createReaderState();
  const dataLayer = createHebrewBibleDataLayer({
    basePath: inferBasePathFromLocation(),
  });
  const deepLink = getDeepLinkState();

  let searchIndex = null;

  state.subscribe((nextState) => {
    renderBookOptions(bookSelect, nextState.books, nextState.selectedBookSlug);
    renderChapterOptions(chapterSelect, nextState.chapters, nextState.selectedChapter);
  });

  bindControls({
    bookSelect,
    chapterSelect,
    verseInput,
    referenceForm,
    referenceInput,
    searchForm,
    searchInput,
    onBookChange: async (bookSlug) => {
      await applyBookSelection(bookSlug, {
        autoSelectChapter: true,
      });
    },
    onChapterChange: async (chapter) => {
      await applyChapterSelection(chapter);
    },
    onVerseJump: async (verse) => {
      await applyVerseSelection(safeParsePositiveInteger(verse));
    },
    onReferenceSubmit: async (query) => {
      await navigateByQuery(query, { preferReferenceOnly: true });
    },
    onSearchSubmit: async (query) => {
      await navigateByQuery(query, { preferReferenceOnly: false });
    },
  });

  searchResultsList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-book][data-chapter]');

    if (!button) {
      return;
    }

    await applyBookSelection(button.dataset.book, {
      autoSelectChapter: false,
      chapterOverride: safeParsePositiveInteger(button.dataset.chapter),
      verseOverride: safeParsePositiveInteger(button.dataset.verse),
    });
  });

  async function applyBookSelection(bookSlug, options = {}) {
    const autoSelectChapter = options.autoSelectChapter ?? false;
    const chapterOverride = options.chapterOverride ?? null;
    const verseOverride = options.verseOverride ?? null;

    state.setState({
      loading: true,
      selectedBookSlug: bookSlug,
      selectedChapter: null,
      selectedVerse: null,
      chapters: [],
      error: null,
    });

    renderStatus(statusElement, 'Loading chapters…');
    renderVerses(versesList, []);

    try {
      const chapters = await dataLayer.getChaptersForBook(bookSlug);
      let selectedChapter = null;

      if (chapterOverride && chapters.some((chapter) => chapter.chapter === chapterOverride)) {
        selectedChapter = chapterOverride;
      } else if (deepLink.book === bookSlug && deepLink.chapter && chapters.some((chapter) => chapter.chapter === deepLink.chapter)) {
        selectedChapter = deepLink.chapter;
      } else if (autoSelectChapter && chapters[0]) {
        selectedChapter = chapters[0].chapter;
      }

      state.setState({
        loading: false,
        chapters,
        selectedBookSlug: bookSlug,
        selectedChapter,
      });

      updateDeepLink(state.getState());

      if (selectedChapter) {
        await applyChapterSelection(selectedChapter, {
          verseOverride: verseOverride || (deepLink.book === bookSlug ? deepLink.verse : null),
        });
      } else {
        renderStatus(statusElement, chapters.length ? 'Choose a chapter to begin reading.' : 'No chapters available for this book.', chapters.length ? 'neutral' : 'warning');
      }
    } catch (error) {
      state.setState({
        loading: false,
        chapters: [],
        selectedChapter: null,
        error,
      });
      renderStatus(statusElement, `Unable to load chapters: ${error.message}`, 'error');
    }
  }

  async function applyChapterSelection(chapter, options = {}) {
    const activeState = state.getState();
    const verseOverride = options.verseOverride ?? null;

    if (!activeState.selectedBookSlug || !chapter) {
      renderVerses(versesList, []);
      renderStatus(statusElement, 'Select a book and chapter to begin reading.');
      return;
    }

    state.setState({
      selectedChapter: chapter,
      selectedVerse: null,
      loading: true,
      error: null,
    });

    renderStatus(statusElement, 'Loading verses…');

    try {
      const verses = await dataLayer.getVerses(activeState.selectedBookSlug, chapter);
      const targetVerse = verseOverride && verses.some((verse) => Number(verse.verse) === Number(verseOverride)) ? verseOverride : null;

      renderVerses(versesList, verses, targetVerse);
      renderStatus(statusElement, verses.length ? '' : 'No verses were found for this chapter.', verses.length ? 'neutral' : 'warning');

      state.setState({
        loading: false,
        selectedChapter: chapter,
        selectedVerse: targetVerse,
      });

      if (targetVerse) {
        verseInput.value = String(targetVerse);
        focusVerse(versesList, targetVerse);
      }

      updateDeepLink(state.getState());
    } catch (error) {
      state.setState({
        loading: false,
        error,
      });

      renderVerses(versesList, []);
      renderStatus(statusElement, `Unable to load verses: ${error.message}`, 'error');
    }
  }

  async function applyVerseSelection(verse) {
    const activeState = state.getState();

    if (!activeState.selectedBookSlug || !activeState.selectedChapter) {
      renderStatus(statusElement, 'Select a book and chapter before jumping to a verse.', 'warning');
      return;
    }

    if (!verse) {
      state.setState({ selectedVerse: null });
      updateDeepLink(state.getState());
      return;
    }

    const targetVerse = await dataLayer.getVerse(activeState.selectedBookSlug, activeState.selectedChapter, verse);

    if (!targetVerse) {
      renderStatus(statusElement, `Verse ${activeState.selectedChapter}:${verse} is not available in this chapter.`, 'warning');
      return;
    }

    const verses = await dataLayer.getVerses(activeState.selectedBookSlug, activeState.selectedChapter);
    renderVerses(versesList, verses, verse);
    state.setState({ selectedVerse: verse });
    focusVerse(versesList, verse);
    renderStatus(statusElement, `Moved to verse ${activeState.selectedChapter}:${verse}.`);
    updateDeepLink(state.getState());
  }

  async function navigateByQuery(query, options) {
    const result = runSearchQuery({
      query,
      books: state.getState().books,
      searchIndex,
    });

    if (result.referenceResult?.type === 'error') {
      renderStatus(statusElement, result.referenceResult.message, 'warning');
      renderSearchResults(searchResultsList, result.textResults);
      return;
    }

    if (result.referenceResult?.type === 'reference') {
      await applyBookSelection(result.referenceResult.bookSlug, {
        autoSelectChapter: false,
        chapterOverride: result.referenceResult.chapter,
        verseOverride: result.referenceResult.verse,
      });

      if (options.preferReferenceOnly) {
        renderSearchResults(searchResultsList, []);
        return;
      }
    }

    renderSearchResults(searchResultsList, result.textResults);

    if (result.message) {
      renderStatus(statusElement, result.message, 'warning');
    }
  }

  try {
    renderStatus(statusElement, 'Loading books…');
    const books = await dataLayer.getAllBooks();
    const verses = await dataLayer.getAllVerses();
    searchIndex = buildSearchIndex(verses);
    state.setState({ books });

    if (!books.length) {
      renderStatus(statusElement, 'No books are available. Confirm the processed data source is present.', 'warning');
      return;
    }

    const deepLinkedBook = deepLink.book && books.find((book) => book.slug === deepLink.book);
    const initialBook = deepLinkedBook?.slug || books[0].slug;

    await applyBookSelection(initialBook, {
      autoSelectChapter: true,
      verseOverride: deepLink.verse,
    });
  } catch (error) {
    state.setState({ error });
    renderStatus(statusElement, `Unable to load Hebrew Bible data: ${error.message}`, 'error');
  }
}

initializeReaderPage();
