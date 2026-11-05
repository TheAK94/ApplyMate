
export function observeFormChanges() {
  // Prevent multiple observers on the same page.
  const win = window as Window & {
    __applyMateObserver?: MutationObserver;
  };

  if (win.__applyMateObserver) {
    return;
  }

  let debounceTimer: ReturnType<typeof setTimeout>;

  const observer = new MutationObserver((mutations) => {
    const relevantChange = mutations.some((mutation) => {
      if (mutation.type === "childList") {
        return true;
      }

      if (mutation.type === "attributes") {
        return true;
      }

      return false;
    });

    if (!relevantChange) return;

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      chrome.runtime.sendMessage({
        type: "APPLYMATE_DOM_CHANGED"
      }).catch(() => {
        // Side panel might be closed.
      });
    }, 400);
  });

  const startObserving = () => {
    if (!document.documentElement) return;

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "hidden",
        "disabled",
        "aria-hidden"
      ]
    });

    win.__applyMateObserver = observer;
  };

  startObserving();
}
