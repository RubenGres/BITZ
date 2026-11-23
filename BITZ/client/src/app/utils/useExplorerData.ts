import { useEffect, useState } from 'react';
import { API_URL } from '../Constants';

export function useExplorerData(network: boolean) {
  const url = API_URL + '/explorer_data' + (network ? '?view=network' : '');
  const [result, setResult] = useState({ url: '', data: {}, error: null as string | null });

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Failed to load explorer data');
        return response.json();
      })
      .then(data => setResult({ url, data, error: null }))
      .catch(error => {
        if (!controller.signal.aborted) setResult({ url, data: {}, error: error.message });
      });
    return () => controller.abort();
  }, [url]);

  return { questDataDict: result.data, loading: result.url !== url, error: result.url === url ? result.error : null };
}
