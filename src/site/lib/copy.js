/** Delegated click handler: copies the code of the clicked block and confirms in the button text. */
export async function handleCopyClick(event, clipboard, schedule) {
  const button = event.target.closest?.('.copy');
  if (!button) return;
  const text = button.closest('.code-block').querySelector('pre').textContent;
  try {
    await clipboard.writeText(text);
    button.textContent = button.dataset?.copied ?? 'Copied';
  } catch {
    button.textContent = button.dataset?.failed ?? 'Copy failed';
  }
  schedule(() => { button.textContent = button.dataset?.copy ?? 'Copy'; }, 2000);
}
