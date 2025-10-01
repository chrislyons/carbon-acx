(function () {
  const details = document.querySelector('[data-behavior="references-accordion"]');
  if (!details || !window.matchMedia) {
    return;
  }

  const mq = window.matchMedia('(max-width: 767px)');

  const syncState = () => {
    if (!details) {
      return;
    }
    if (mq.matches) {
      details.removeAttribute('open');
    } else {
      details.setAttribute('open', '');
    }
  };

  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', syncState);
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(syncState);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncState, { once: true });
  } else {
    syncState();
  }
})();
