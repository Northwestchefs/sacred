function bindControls({
  bookSelect,
  chapterSelect,
  verseInput,
  referenceForm,
  referenceInput,
  searchForm,
  searchInput,
  onBookChange,
  onChapterChange,
  onVerseJump,
  onReferenceSubmit,
  onSearchSubmit,
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
}

export {
  bindControls,
};
