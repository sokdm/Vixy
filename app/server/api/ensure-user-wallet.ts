// @ts-nocheck
import { authenticateRequestUser } from '../../../shared/admin-auth.js';
import { connectMongo, ensureWallet } from '../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectMongo();
    const authResult = await authenticateRequestUser(req);
    if (authResult.error) return res.status(authResult.status).json({ error: authResult.error });
    const wallet = await ensureWallet(authResult.user.id);
    return res.json({ walletReady: true, wallet });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to prepare wallet' });
  }
}
