// "interactive" can precede deferred SDK execution. Only a fully loaded
// document may skip the event barrier used by the initial module entry.
export function onDocumentReady(document, start) {
    if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
}
