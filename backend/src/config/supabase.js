const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const FLOOR_PLANS_BUCKET = 'floor-plans';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

module.exports = { supabase, FLOOR_PLANS_BUCKET };
