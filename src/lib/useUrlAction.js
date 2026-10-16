import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Run `action` once when the page is opened with ?<param>=…, then drop the
 * param so a refresh or Back doesn't run it again. The ⌘K palette and the
 * Dashboard link to pages this way (e.g. /admin/tasks?new=1 opens the form).
 *
 * Waits for `ready` so the action sees loaded data — a form opened before its
 * member list arrives would render empty.
 */
export function useUrlAction(param, ready, action) {
  const [searchParams, setSearchParams] = useSearchParams();
  const done = useRef(false);
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; });

  const value = searchParams.get(param);

  useEffect(() => {
    if (!ready || done.current || value == null) return;
    done.current = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(param);
      return next;
    }, { replace: true });
    actionRef.current(value);
  }, [ready, value, param, setSearchParams]);
}
