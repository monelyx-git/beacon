import { render } from 'preact';
import SearchDialog from '../components/SearchDialog.jsx';

let dialog;
/** Mounts the dialog once, then opens it. It is never unmounted: the browser handles Escape, backdrop and focus return. */
export function openSearch(base) {
  if (!dialog) {
    const host = document.createElement('div');
    document.body.append(host);
    render(<SearchDialog base={base} />, host);
    dialog = host.querySelector('dialog');
  }
  if (!dialog.open) dialog.showModal();
}
