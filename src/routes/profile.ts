import express from 'express';
import { verifyFirebaseToken } from '../firebase/verifyFirebaseToken';
import { createClient } from '@supabase/supabase-js';

const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

app.get('/profile', verifyFirebaseToken, async (req, res) => {
  const { uid, email } = (req as any).user;

  const { data: user, error } = await supabase
    .from('members')
    .select('*')
    .eq('firebase_uid', uid)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    firebase: { uid, email },
    supabase: user,
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
