// @ts-nocheck
import { authenticateRequestUser } from '../../../shared/admin-auth.js';
import { connectMongo, FeedbackModel } from '../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectMongo();
    const auth = await authenticateRequestUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });

    const message = String(req.body?.message || '').trim();
    if (message.length < 10) {
      return res.status(400).json({ error: 'Please write at least 10 characters.' });
    }

    await FeedbackModel.create({
      userId: auth.user.id,
      email: auth.user.email,
      category: String(req.body?.category || 'experience').trim() || 'experience',
      rating: req.body?.rating == null ? null : Number(req.body.rating),
      message: message.slice(0, 4000),
      requestId: String(req.body?.id || req.body?.requestId || ''),
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Feedback could not be saved.' });
  }
}
