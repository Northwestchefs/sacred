function bindControls({
  bookSelect,
  chapterSelect,
  verseInput,
  referenceForm,
  referenceInput,
  searchForm,
  searchInput,
  searchScopeSelect,
  searchPagePreviousButton,
  searchPageNextButton,
  previousChapterButton,
  nextChapterButton,
  displayModeSelect,
  onBookChange,
  onChapterChange,
  onVerseJump,
  onReferenceSubmit,
  onSearchSubmit,
  onSearchScopeChange,
  onSearchPreviousPage,
  onSearchNextPage,
  onPreviousChapter,
  onNextChapter,
  onDisplayModeChange,
}) {
  bookSelect.addEventListener('change', () => {
    onBookChange(bookSelect.value || null);
  });

  chapterSelect.addEventListener('change', () => {
    const value = chapterSelect.value;
    onChapterChange(value ? Number(value) : null);
  });

  verseInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    onVerseJump(verseInput.value);
  });

  referenceForm.addEventListener('submit', (event) => {
    event.preventDefault();
    onReferenceSubmit(referenceInput.value);
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    onSearchSubmit(searchInput.value);
  });

  if (searchScopeSelect && onSearchScopeChange) {
    searchScopeSelect.addEventListener('change', () => {
      onSearchScopeChange(searchScopeSelect.value);
    });
  }


  if (searchPagePreviousButton && onSearchPreviousPage) {
    searchPagePreviousButton.addEventListener('click', () => {
      onSearchPreviousPage();
    });
  }

  if (searchPageNextButton && onSearchNextPage) {
    searchPageNextButton.addEventListener('click', () => {
      onSearchNextPage();
    });
  }

  if (previousChapterButton && onPreviousChapter) {
    previousChapterButton.addEventListener('click', () => {
      onPreviousChapter();
    });
  }

  if (nextChapterButton && onNextChapter) {
    nextChapterButton.addEventListener('click', () => {
      onNextChapter();
    });
  }

  if (displayModeSelect && onDisplayModeChange) {
    displayModeSelect.addEventListener('change', () => {
      onDisplayModeChange(displayModeSelect.value);
    });
  }
}

export {
  bindControls,
};
