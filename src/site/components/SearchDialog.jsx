import { useEffect, useRef, useState } from 'preact/hooks';
import { loadPagefind, runSearch } from '../lib/search.js';

export default function SearchDialog({ base }) {
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
      } catch {
        if (!stale) setFailed(true);
      }
    }, 120);
    return () => { stale = true; clearTimeout(timer); };
  }, [query]);

  const status = failed ? 'Search is unavailable.' : results === null ? '' : results.length ? `${results.length} results` : 'No results';

  return (
    <dialog ref={dialog} class="search" aria-label="Search documentation"
      onClick={(e) => e.target === dialog.current && dialog.current.close()}>
      <input type="search" aria-label="Search documentation" placeholder="Search the docs" autofocus value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && results?.[0] && (location.href = results[0].url)} />
      <p class="search-status" role="status">{status}</p>
      {results?.length > 0 && (
        <ul aria-label="Results">
          {results.map((r) => (
            <li key={r.url}><a href={r.url}><strong>{r.title}</strong><span dangerouslySetInnerHTML={{ __html: r.excerpt }} /></a></li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
