function createReaderState(initialState = {}) {
  const state = {
    books: [],
    chapters: [],
    selectedBookSlug: null,
    selectedChapter: null,
    selectedVerse: null,
    searchResults: [],
    loading: false,
    error: null,
    ...initialState,
  };

  const listeners = new Set();

  function getState() {
    return { ...state };
  }

  function setState(patch) {
    Object.assign(state, patch);
    for (const listener of listeners) {
      listener(getState());
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getState,
    setState,
    subscribe,
  };
}

export {
  createReaderState,
};
