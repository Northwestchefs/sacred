function bindControls({
  bookSelect,
  chapterSelect,
  onBookChange,
  onChapterChange,
}) {
  bookSelect.addEventListener('change', () => {
    onBookChange(bookSelect.value || null);
  });

  chapterSelect.addEventListener('change', () => {
    const value = chapterSelect.value;
    onChapterChange(value ? Number(value) : null);
  });
}

export {
  bindControls,
};
