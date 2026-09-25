// @ts-nocheck
import { authenticateRequestUser } from '../../../shared/admin-auth.js';
import { connectMongo, UserModel } from '../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await connectMongo();
  const authResult = await authenticateRequestUser(req);
  if (authResult.error) return res.status(authResult.status).json({ error: authResult.error });

  const user = await UserModel.findById(authResult.user.id).lean();
  const referrals = await UserModel.find({ referredByUserId: authResult.user.id }).sort({ createdAt: -1 }).lean();

  return res.json({
    referralCode: user?.referralCode || '',
    referredCount: referrals.length,
    qualifyingPurchaseCount: 0,
    rewardedCount: 0,
    totalReferralCreditsEarned: 0,
    referrals: referrals.map((item) => ({
      id: String(item._id),
      status: 'registered',
      createdAt: item.createdAt?.toISOString?.() || null,
      qualifiedAt: null,
      rewardedAt: null,
      refundWarning: false,
    })),
  });
}
