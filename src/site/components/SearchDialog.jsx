import { useEffect, useRef, useState } from 'preact/hooks';
import { loadPagefind, runSearch } from '../lib/search.js';
import { t } from '../lib/strings.js';

export default function SearchDialog({ base }) {
  const s = t(document.documentElement.lang);
  const dialog = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!query.trim()) return setResults(null);
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const found = await runSearch(await loadPagefind(base), query);
        if (!stale) { setResults(found); setFailed(false); }
      } catch (err) {
        console.error('beacon search failed:', err);
        if (!stale) setFailed(true);
      }
    }, 120);
    return () => { stale = true; clearTimeout(timer); };
  }, [query]);

  const status = failed ? s.searchUnavailable : results === null ? '' : results.length ? `${results.length} ${s.results}` : s.noResults;

  return (
    <dialog ref={dialog} class="search" aria-label={s.searchLabel}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}>
      <input type="search" aria-label={s.searchLabel} placeholder={s.searchPlaceholder} autofocus value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results?.[0]) location.href = results[0].url;
          // type=search clears its text on the first Escape; one press should close the dialog.
          if (e.key === 'Escape') { e.preventDefault(); dialog.current.close(); }
        }} />
      <p class="search-status" role="status">{status}</p>
      {results?.length > 0 && (
        <ul aria-label={s.resultsLabel}>
          {results.map((r) => (
            <li key={r.url}><a href={r.url}><strong>{r.title}</strong><span dangerouslySetInnerHTML={{ __html: r.excerpt }} /></a></li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
