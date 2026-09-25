// @ts-nocheck
import { isLocalPreviewRequest } from '../local-preview.js';
import { connectMongo, ensureWallet, TransactionModel } from '../mongo.js';
import { logErrorEvent, logRequestEvent } from '../../../shared/backend-logger.js';
import { authenticateRequestUser } from '../../../shared/admin-auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (isLocalPreviewRequest(req)) return res.status(200).json({ balance: 10000, credits: 999999, transactions: [] });

  try {
    await connectMongo();
    const authResult = await authenticateRequestUser(req);
    if (authResult.error) return res.status(authResult.status).json({ error: authResult.error });

    const userId = authResult.user.id;
    const requestedUserId = req.query.userId || req.query.id;
    if (requestedUserId && requestedUserId !== userId) return res.status(403).json({ error: 'User mismatch' });

    await logRequestEvent('wallet.request', { method: req.method, path: '/api/wallet', userId });

    const [wallet, txs] = await Promise.all([
      ensureWallet(userId),
      TransactionModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return res.json({
      balance: wallet?.balance || 0,
      credits: wallet?.credits || 0,
      transactions: (txs || []).map((tx) => ({
        id: String(tx._id),
        type: tx.type,
        amount: tx.amountNaira || 0,
        credits: tx.credits || 0,
        description: tx.metadata?.description || (tx.type === 'credit' ? 'Credits purchased' : 'Session usage'),
        timestamp: tx.createdAt,
      })),
    });
  } catch (error) {
    await logErrorEvent('wallet.exception', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
