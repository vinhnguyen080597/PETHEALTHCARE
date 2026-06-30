import dotenv from 'dotenv';
import { getSupabaseServiceClient } from '../src/config/supabase.js';

dotenv.config();

const admin = getSupabaseServiceClient();
if (!admin) {
  console.error('Supabase service client is not configured.');
  process.exit(1);
}

const { data, error: readError } = await admin
  .from('app_settings')
  .select('key, value')
  .eq('key', 'feature_flags')
  .maybeSingle();

if (readError) {
  if (/relation .* does not exist/i.test(readError.message)) {
    console.error(
      'Table app_settings is missing. Run the SQL block in pet-health-backend/context/supabase-schema.sql (app_settings section) in Supabase SQL editor first.',
    );
    process.exit(1);
  }
  console.error('Read failed:', readError.message);
  process.exit(1);
}

if (data) {
  console.log('feature_flags already present:', JSON.stringify(data.value));
  process.exit(0);
}

const { error: insertError } = await admin.from('app_settings').insert({
  key: 'feature_flags',
  value: { breed_recognition: true, health_analysis: true, rewarded_ads: true, subscription: true },
});

if (insertError) {
  console.error('Insert failed:', insertError.message);
  process.exit(1);
}

console.log('Seeded default feature_flags');
