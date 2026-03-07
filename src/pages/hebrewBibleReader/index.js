import { createHebrewBibleDataLayer } from '../../data/hebrewBible/index.js';
import { bindControls } from './controls.js';
import {
  renderBookOptions,
  renderChapterOptions,
  renderSearchResults,
  renderSearchSummary,
  renderStatus,
  renderVerses,
  updateChapterNav,
  updateHeaderMeta,
} from './render.js';
import { createReaderState } from './state.js';
import { buildSearchIndex, runSearchQuery } from '../../search/hebrewBible/index.js';
import { createEnglishBibleDataLayer } from '../../data/englishBible/index.js';

const READER_PREFERENCES_KEY = 'sacred.hebrewBible.preferences';

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

function loadReaderPreferences() {
  try {
    const raw = window.localStorage.getItem(READER_PREFERENCES_KEY);

    if (!raw) {
      return {
        fontScale: 118,
        lineHeight: 180,
        showVerseNumbers: true,
        zenMode: false,
        displayMode: 'parallel',
      };
    }

    const parsed = JSON.parse(raw);

    return {
      fontScale: Number(parsed.fontScale) || 118,
      lineHeight: Number(parsed.lineHeight) || 180,
      showVerseNumbers: parsed.showVerseNumbers !== false,
      zenMode: Boolean(parsed.zenMode),
      displayMode: ['hebrew', 'english', 'parallel'].includes(parsed.displayMode) ? parsed.displayMode : 'parallel',
    };
  } catch {
    return {
      fontScale: 118,
      lineHeight: 180,
      showVerseNumbers: true,
      zenMode: false,
      displayMode: 'parallel',
    };
  }
}

function saveReaderPreferences(preferences) {
  window.localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify(preferences));
}

function getCurrentReferenceLabel(nextState) {
  if (!nextState.selectedBookSlug || !nextState.selectedChapter) {
    return 'Ready to begin';
  }

  const book = nextState.books.find((item) => item.slug === nextState.selectedBookSlug);
  const bookName = book?.bookEnglish || book?.book || nextState.selectedBookSlug;

  if (nextState.selectedVerse) {
    return `${bookName} ${nextState.selectedChapter}:${nextState.selectedVerse}`;
  }

  return `${bookName} ${nextState.selectedChapter}`;
}

function mergeChapterVerses({ hebrewVerses, englishVerses, bookSlug, chapter }) {
  const sortedHebrewVerses = [...(hebrewVerses || [])].sort((a, b) => Number(a.verse) - Number(b.verse));
  const sortedEnglishVerses = [...(englishVerses || [])].sort((a, b) => Number(a.verse) - Number(b.verse));

  const englishByVerse = new Map(sortedEnglishVerses.map((verse) => [Number(verse.verse), verse]));
  const exactMatchCount = sortedHebrewVerses.reduce(
    (count, verse) => count + (englishByVerse.has(Number(verse.verse)) ? 1 : 0),
    0
  );

  const deltaCandidates = [];
  for (let delta = -10; delta <= 10; delta += 1) {
    const matched = sortedHebrewVerses.reduce((count, verse) => {
      const englishVerseNumber = Number(verse.verse) + delta;
      return count + (englishByVerse.has(englishVerseNumber) ? 1 : 0);
    }, 0);

    deltaCandidates.push({ delta, matched });
  }

  const bestDeltaCandidate = deltaCandidates.sort((a, b) => b.matched - a.matched)[0] || { delta: 0, matched: 0 };
  const useShiftedCorrelation =
    bestDeltaCandidate.delta !== 0 && bestDeltaCandidate.matched > exactMatchCount && bestDeltaCandidate.matched > 0;
  const verseDelta = useShiftedCorrelation ? bestDeltaCandidate.delta : 0;

  const diagnosticsByVerse = new Map();
  const merged = sortedHebrewVerses.map((verse) => {
    const verseNumber = Number(verse.verse);
    const correlatedEnglishVerseNumber = verseNumber + verseDelta;
    const english = englishByVerse.get(correlatedEnglishVerseNumber);

    if (!english) {
      diagnosticsByVerse.set(
        verseNumber,
        `Numbering mismatch: ${bookSlug} ${chapter}:${verseNumber} exists in Hebrew but is missing in JPS 1917.`
      );
    } else if (verseDelta !== 0) {
      diagnosticsByVerse.set(
        verseNumber,
        `Numbering mismatch resolved: ${bookSlug} ${chapter}:${verseNumber} (Hebrew) is correlated to JPS 1917 ${chapter}:${correlatedEnglishVerseNumber}.`
      );
    }

    return {
      ...verse,
      english: english?.english || null,
    };
  });

  const matchedEnglishVerseNumbers = new Set(
    merged.filter((verse) => verse.english).map((verse) => Number(verse.verse) + verseDelta)
  );

  for (const englishVerse of sortedEnglishVerses) {
    const verseNumber = Number(englishVerse.verse);
    const existsInHebrew = matchedEnglishVerseNumbers.has(verseNumber);

    if (!existsInHebrew) {
      diagnosticsByVerse.set(
        verseNumber,
        `Numbering mismatch: ${bookSlug} ${chapter}:${verseNumber} exists in JPS 1917 but is missing in Hebrew source.`
      );
    }
  }

  return {
    verses: merged,
    diagnosticsByVerse,
    hasMismatch: diagnosticsByVerse.size > 0,
  };
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
  const searchSummaryElement = document.querySelector('#search-summary');
  const versesList = document.querySelector('#verses-list');
  const statusElement = document.querySelector('#reader-status');
  const currentReferenceElement = document.querySelector('#current-reference');
  const chapterProgressElement = document.querySelector('#chapter-progress');
  const fontScaleInput = document.querySelector('#font-scale');
  const lineHeightInput = document.querySelector('#line-height');
  const showVerseNumbersInput = document.querySelector('#toggle-verse-numbers');
  const zenModeInput = document.querySelector('#toggle-zen-mode');
  const zenModeExitButton = document.querySelector('#zen-mode-exit');
  const searchScopeSelect = document.querySelector('#search-scope');
  const previousChapterButton = document.querySelector('#previous-chapter');
  const nextChapterButton = document.querySelector('#next-chapter');
  const displayModeSelect = document.querySelector('#display-mode-select');

  const readerPreferences = loadReaderPreferences();
  const state = createReaderState({ displayMode: readerPreferences.displayMode });
  const basePath = inferBasePathFromLocation();
  const dataLayer = createHebrewBibleDataLayer({
    basePath,
  });
  const englishDataLayer = createEnglishBibleDataLayer({
    basePath,
  });
  const deepLink = getDeepLinkState();

  let currentChapterVerses = [];
  let searchIndex = null;
  let currentSearchScope = 'all';

  function applyPreferences() {
    document.documentElement.style.setProperty('--verse-size', `${readerPreferences.fontScale / 100}rem`);
    document.documentElement.style.setProperty('--verse-leading', `${readerPreferences.lineHeight / 100}`);
    document.body.classList.toggle('hide-verse-numbers', !readerPreferences.showVerseNumbers);
    document.body.classList.toggle('zen-mode', readerPreferences.zenMode);

    fontScaleInput.value = String(readerPreferences.fontScale);
    lineHeightInput.value = String(readerPreferences.lineHeight);
    showVerseNumbersInput.checked = readerPreferences.showVerseNumbers;
    zenModeInput.checked = readerPreferences.zenMode;
    zenModeExitButton.hidden = !readerPreferences.zenMode;
    if (displayModeSelect) {
      displayModeSelect.value = state.getState().displayMode || 'parallel';
    }
  }

  function updateHeader(nextState) {
    updateHeaderMeta({
      referenceElement: currentReferenceElement,
      progressElement: chapterProgressElement,
      reference: getCurrentReferenceLabel(nextState),
      currentVerse: nextState.selectedVerse,
      verseCount: currentChapterVerses.length,
    });
  }

  applyPreferences();

  state.subscribe((nextState) => {
    renderBookOptions(bookSelect, nextState.books, nextState.selectedBookSlug);
    renderChapterOptions(chapterSelect, nextState.chapters, nextState.selectedChapter);
    updateHeader(nextState);
    updateChapterNav({
      previousButton: previousChapterButton,
      nextButton: nextChapterButton,
      selectedChapter: nextState.selectedChapter,
      availableChapters: nextState.chapters,
    });
  });

  bindControls({
    bookSelect,
    chapterSelect,
    verseInput,
    referenceForm,
    referenceInput,
    searchForm,
    searchInput,
    searchScopeSelect,
    previousChapterButton,
    nextChapterButton,
    displayModeSelect,
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
    onSearchScopeChange: (scope) => {
      currentSearchScope = scope === 'current' ? 'current' : 'all';
    },
    onPreviousChapter: async () => {
      await navigateRelativeChapter(-1);
    },
    onNextChapter: async () => {
      await navigateRelativeChapter(1);
    },
    onDisplayModeChange: (mode) => {
      const value = ['hebrew', 'english', 'parallel'].includes(mode) ? mode : 'parallel';
      state.setState({ displayMode: value });
      readerPreferences.displayMode = value;
      saveReaderPreferences(readerPreferences);
      renderVerses(versesList, currentChapterVerses, state.getState().selectedVerse, {
        displayMode: value,
        diagnosticsByVerse: state.getState().chapterDiagnostics?.diagnosticsByVerse || new Map(),
      });
    },
  });

  fontScaleInput.addEventListener('input', () => {
    readerPreferences.fontScale = Number(fontScaleInput.value);
    applyPreferences();
    saveReaderPreferences(readerPreferences);
  });

  lineHeightInput.addEventListener('input', () => {
    readerPreferences.lineHeight = Number(lineHeightInput.value);
    applyPreferences();
    saveReaderPreferences(readerPreferences);
  });

  showVerseNumbersInput.addEventListener('change', () => {
    readerPreferences.showVerseNumbers = showVerseNumbersInput.checked;
    applyPreferences();
    saveReaderPreferences(readerPreferences);
  });

  zenModeInput.addEventListener('change', () => {
    readerPreferences.zenMode = zenModeInput.checked;
    applyPreferences();
    saveReaderPreferences(readerPreferences);
  });

  zenModeExitButton.addEventListener('click', () => {
    readerPreferences.zenMode = false;
    applyPreferences();
    saveReaderPreferences(readerPreferences);
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


  function getAdjacentChapterOffset(offset) {
    const activeState = state.getState();
    const chapters = activeState.chapters || [];
    const current = activeState.selectedChapter;

    if (!current || !chapters.length) {
      return null;
    }

    const chapterNumbers = chapters.map((item) => item.chapter).sort((a, b) => a - b);
    const index = chapterNumbers.indexOf(current);

    if (index < 0) {
      return null;
    }

    return chapterNumbers[index + offset] || null;
  }

  async function navigateRelativeChapter(offset) {
    const targetChapter = getAdjacentChapterOffset(offset);

    if (!targetChapter) {
      return;
    }

    await applyChapterSelection(targetChapter);
    chapterSelect.value = String(targetChapter);
  }

  versesList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-copy-verse]');

    if (!button) {
      return;
    }

    const verseNumber = safeParsePositiveInteger(button.dataset.copyVerse);
    const verse = currentChapterVerses.find((item) => Number(item.verse) === verseNumber);

    if (!verse) {
      return;
    }

    const activeState = state.getState();
    const text = verse.hebrew ?? verse.textHebrew ?? verse.text ?? '';
    const reference = `${activeState.selectedBookSlug} ${activeState.selectedChapter}:${verseNumber}`;

    try {
      await window.navigator.clipboard.writeText(`${reference}\n${text}`);
      renderStatus(statusElement, `Copied ${reference}.`);
    } catch {
      renderStatus(statusElement, 'Copy is unavailable in this browser context.', 'warning');
    }
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
      chapterDiagnostics: null,
    });

    currentChapterVerses = [];
    renderStatus(statusElement, 'Loading chapters…');
    renderVerses(versesList, [], null, { displayMode: state.getState().displayMode });

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
      currentChapterVerses = [];
      renderVerses(versesList, [], null, { displayMode: state.getState().displayMode });
      renderStatus(statusElement, 'Select a book and chapter to begin reading.');
      updateHeader(state.getState());
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
      const hebrewVerses = await dataLayer.getVerses(activeState.selectedBookSlug, chapter);
      const englishVerses = await englishDataLayer.getChapterVerses(activeState.selectedBookSlug, chapter);
      const mergedChapter = mergeChapterVerses({
        hebrewVerses,
        englishVerses,
        bookSlug: activeState.selectedBookSlug,
        chapter,
      });
      const verses = mergedChapter.verses;
      const targetVerse = verseOverride && verses.some((verse) => Number(verse.verse) === Number(verseOverride)) ? verseOverride : null;

      currentChapterVerses = verses;
      renderVerses(versesList, verses, targetVerse, {
        displayMode: activeState.displayMode,
        diagnosticsByVerse: mergedChapter.diagnosticsByVerse,
      });

      if (mergedChapter.hasMismatch) {
        renderStatus(statusElement, 'Numbering mismatch detected between Hebrew and JPS 1917 data for this chapter.', 'warning');
      } else {
        renderStatus(statusElement, verses.length ? '' : 'No verses were found for this chapter.', verses.length ? 'neutral' : 'warning');
      }

      state.setState({
        loading: false,
        selectedChapter: chapter,
        selectedVerse: targetVerse,
        chapterDiagnostics: mergedChapter,
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

      currentChapterVerses = [];
      renderVerses(versesList, [], null, { displayMode: state.getState().displayMode });
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

    renderVerses(versesList, currentChapterVerses, verse, {
      displayMode: activeState.displayMode,
      diagnosticsByVerse: activeState.chapterDiagnostics?.diagnosticsByVerse || new Map(),
    });
    state.setState({ selectedVerse: verse });
    focusVerse(versesList, verse);
    renderStatus(statusElement, `Moved to verse ${activeState.selectedChapter}:${verse}.`);
    updateDeepLink(state.getState());
  }

  async function navigateByQuery(query, options) {
    const activeState = state.getState();
    const result = runSearchQuery({
      query,
      books: activeState.books,
      searchIndex,
      options: {
        searchScope: currentSearchScope,
        selectedBookSlug: activeState.selectedBookSlug,
      },
    });

    if (result.referenceResult?.type === 'error') {
      renderStatus(statusElement, result.referenceResult.message, 'warning');
      renderSearchResults(searchResultsList, result.textResults);
      renderSearchSummary(searchSummaryElement, {
        query,
        totalResults: result.textResults.length,
        scopeLabel: result.searchedBookSlug ? 'the current book' : 'all books',
      });
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
        renderSearchSummary(searchSummaryElement, { query: '', totalResults: 0 });
        return;
      }
    }

    renderSearchResults(searchResultsList, result.textResults);
    renderSearchSummary(searchSummaryElement, {
      query,
      totalResults: result.textResults.length,
      scopeLabel: result.searchedBookSlug ? 'the current book' : 'all books',
    });

    if (result.message) {
      renderStatus(statusElement, result.message, 'warning');
    }
  }

  try {
    renderStatus(statusElement, 'Loading books…');
    const books = await dataLayer.getAllBooks();
    await englishDataLayer.getBooks();
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
