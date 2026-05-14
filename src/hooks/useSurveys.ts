import { useState, useEffect } from 'react';
import { SurveysService, type SurveyWithCount } from '../services/surveysService';

export function useSurveys() {
  const [surveys, setSurveys] = useState<SurveyWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<Error | null>(null);

  const reload = () => {
    setLoading(true);
    SurveysService.getAll()
      .then(setSurveys)
      .catch(e => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  return { surveys, loading, error, reload };
}
