// Runs `write`, confirms in the button text, then restores the label.
async function copyWith(button, write, label, schedule) {
  try {
    await write();
    button.textContent = button.dataset?.copied ?? 'Copied';
  } catch {
    button.textContent = button.dataset?.failed ?? 'Copy failed';
  }
  schedule(() => { button.textContent = button.dataset?.copy ?? label; }, 2000);
}

/** Delegated click handler: copies the code of the clicked block and confirms in the button text. */
export async function handleCopyClick(event, clipboard, schedule) {
  const button = event.target.closest?.('.copy');
  if (!button) return;
  const text = button.closest('.code-block').querySelector('pre').textContent;
  await copyWith(button, () => clipboard.writeText(text), 'Copy', schedule);
}

/**
 * Delegated click handler for the copy-page button: copies the page's published Markdown.
 * With ClipboardItem the write starts inside the click and the text is a pending promise, because
 * Safari rejects a clipboard write that happens after an await.
 */
export async function handlePageCopyClick(event, { fetch, clipboard, ClipboardItem }, schedule) {
  const button = event.target.closest?.('.copy-page');
  if (!button) return;
  const load = () => fetch(button.dataset.md).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });
  await copyWith(button, () => (ClipboardItem
    ? clipboard.write([new ClipboardItem({ 'text/plain': load().then((t) => new Blob([t], { type: 'text/plain' })) })])
    : load().then((t) => clipboard.writeText(t))), 'Copy page', schedule);
}
