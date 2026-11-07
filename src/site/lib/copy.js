/** Delegated click handler: copies the code of the clicked block and confirms in the button text. */
export async function handleCopyClick(event, clipboard, schedule) {
  const button = event.target.closest?.('.copy');
  if (!button) return;
  const text = button.closest('.code-block').querySelector('pre').textContent;
  try {
    await clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Copy failed';
  }
  schedule(() => { button.textContent = 'Copy'; }, 2000);
}
