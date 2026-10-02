// A minimal pub/sub so unrelated components (e.g. the always-mounted
// AddUser popup) can tell pages with their own fetched data (Overview,
// Home) to refetch, without introducing a full global store.
export const PERSON_ADDED_EVENT = 'familytree:person-added';

export function notifyPersonAdded(): void {
  window.dispatchEvent(new CustomEvent(PERSON_ADDED_EVENT));
}

export function onPersonAdded(handler: () => void): () => void {
  window.addEventListener(PERSON_ADDED_EVENT, handler);
  return () => window.removeEventListener(PERSON_ADDED_EVENT, handler);
}
