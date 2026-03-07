import { createHebrewBibleDataLayer } from '../../data/hebrewBible/index.js';
import { bindControls } from './controls.js';
import { renderBookOptions, renderChapterOptions, renderStatus, renderVerses } from './render.js';
import { createReaderState } from './state.js';

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

  return {
    book,
    chapter,
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

async function initializeReaderPage() {
  const bookSelect = document.querySelector('#book-select');
  const chapterSelect = document.querySelector('#chapter-select');
  const versesList = document.querySelector('#verses-list');
  const statusElement = document.querySelector('#reader-status');

  const state = createReaderState();
  const dataLayer = createHebrewBibleDataLayer({
    basePath: inferBasePathFromLocation(),
  });
  const deepLink = getDeepLinkState();

  state.subscribe((nextState) => {
    renderBookOptions(bookSelect, nextState.books, nextState.selectedBookSlug);
    renderChapterOptions(chapterSelect, nextState.chapters, nextState.selectedChapter);
  });

  bindControls({
    bookSelect,
    chapterSelect,
    onBookChange: async (bookSlug) => {
      await applyBookSelection(bookSlug, {
        autoSelectChapter: true,
      });
    },
    onChapterChange: async (chapter) => {
      await applyChapterSelection(chapter);
    },
  });

  async function applyBookSelection(bookSlug, options = {}) {
    const autoSelectChapter = options.autoSelectChapter ?? false;
    state.setState({
      loading: true,
      selectedBookSlug: bookSlug,
      selectedChapter: null,
      chapters: [],
      error: null,
    });

    renderStatus(statusElement, 'Loading chapters…');
    renderVerses(versesList, []);

    try {
      const chapters = await dataLayer.getChaptersForBook(bookSlug);
      let selectedChapter = null;

      if (deepLink.book === bookSlug && deepLink.chapter && chapters.some((chapter) => chapter.chapter === deepLink.chapter)) {
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
        await applyChapterSelection(selectedChapter);
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

  async function applyChapterSelection(chapter) {
    const activeState = state.getState();

    if (!activeState.selectedBookSlug || !chapter) {
      renderVerses(versesList, []);
      renderStatus(statusElement, 'Select a book and chapter to begin reading.');
      return;
    }

    state.setState({
      selectedChapter: chapter,
      loading: true,
      error: null,
    });

    renderStatus(statusElement, 'Loading verses…');

    try {
      const verses = await dataLayer.getVerses(activeState.selectedBookSlug, chapter);
      renderVerses(versesList, verses);
      renderStatus(statusElement, verses.length ? '' : 'No verses were found for this chapter.', verses.length ? 'neutral' : 'warning');

      state.setState({
        loading: false,
        selectedChapter: chapter,
      });

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

  try {
    renderStatus(statusElement, 'Loading books…');
    const books = await dataLayer.getAllBooks();
    state.setState({ books });

    if (!books.length) {
      renderStatus(statusElement, 'No books are available. Confirm the processed data source is present.', 'warning');
      return;
    }

    const deepLinkedBook = deepLink.book && books.find((book) => book.slug === deepLink.book);
    const initialBook = deepLinkedBook?.slug || books[0].slug;

    await applyBookSelection(initialBook, {
      autoSelectChapter: true,
    });
  } catch (error) {
    state.setState({ error });
    renderStatus(statusElement, `Unable to load Hebrew Bible data: ${error.message}`, 'error');
  }
}

initializeReaderPage();
