import { useState, useEffect } from 'react';
import { TemplatesService } from '../services/templatesService';
import type { Template } from '../types';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    TemplatesService.getAll()
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  return { templates, loading };
}
