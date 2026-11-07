import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { nextTab } from '../lib/tabs-logic.js';

// Panels arrive as static HTML (all visible without JS); this island builds the tab list and hides inactive panels.
export default function TabsIsland({ children }) {
  const id = useId();
  const panelsRef = useRef(null);
  const buttons = useRef([]);
  const [labels, setLabels] = useState([]);
  const [active, setActive] = useState(0);
  const panels = () => [...panelsRef.current.querySelectorAll('[data-tab-label]')];

  useEffect(() => setLabels(panels().map((p) => p.dataset.tabLabel)), []);
  useEffect(() => {
    panels().forEach((p, i) => {
      p.hidden = i !== active;
      p.id = `${id}-panel-${i}`;
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', `${id}-tab-${i}`);
    });
  }, [active, labels]);

  const onKeyDown = (e) => {
    const next = nextTab(e.key, active, labels.length);
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <div class="tabs" data-ready={labels.length ? '' : undefined}>
      {labels.length > 0 && (
        <div role="tablist" aria-label="Options" onKeyDown={onKeyDown}>
          {labels.map((label, i) => (
            <button type="button" role="tab" key={label} ref={(el) => (buttons.current[i] = el)}
              id={`${id}-tab-${i}`} aria-selected={i === active} aria-controls={`${id}-panel-${i}`}
              tabIndex={i === active ? 0 : -1} onClick={() => setActive(i)}>{label}</button>
          ))}
        </div>
      )}
      <div ref={panelsRef}>{children}</div>
    </div>
  );
}
