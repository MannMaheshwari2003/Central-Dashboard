import { useEffect, useRef, useState } from "react";

/**
 * useAsync — generic data-fetching hook used by all the more specific
 * hooks below. Runs `fetcher()` whenever `deps` changes and exposes
 * {data, loading, error, reload}.
 */
export function useAsync(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const counter = useRef(0);

  function load() {
    const id = ++counter.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        if (id === counter.current) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (id === counter.current) {
          setError(err.message || String(err));
          setLoading(false);
        }
      });
  }

  useEffect(load, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, reload: load };
}
