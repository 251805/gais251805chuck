import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

export async function generateGSOID(): Promise<string> {
  const dateStr = format(new Date(), 'MMddyy');
  const prefix = `GSOID${dateStr}`;
  
  const { data, error } = await supabase
    .from('gsoid')
    .select('id')
    .ilike('id', `${prefix}%`)
    .order('id', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching latest GSOID:', error);
    // Fallback if DB fetch fails
    return `${prefix}${Math.floor(Math.random() * 900) + 100}`;
  }

  if (!data || data.length === 0) {
    return `${prefix}001`;
  }

  const lastId = data[0].id;
  const lastNumber = parseInt(lastId.slice(-3));
  const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
  
  return `${prefix}${nextNumber}`;
}
