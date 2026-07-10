// src/lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Browser client — use this in Client Components
export const supabase = createClientComponentClient();
