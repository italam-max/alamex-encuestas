import { supabase } from '../lib/supabase';
import type { Template } from '../types';

export const TemplatesService = {
  async getAll(): Promise<Template[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },
};
