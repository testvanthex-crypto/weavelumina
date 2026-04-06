import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://upmszzpleowoafflxedq.supabase.co';
const supabaseKey = 'sb_publishable_84f-8yXbtUZmAJGVxXTnAA_ZXGIrifK';

export const supabase = createClient(supabaseUrl, supabaseKey);
