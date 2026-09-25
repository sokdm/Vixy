// @ts-nocheck
import { connectMongo, UserModel } from '../mongo.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const code = String(req.query?.code || '').trim().toUpperCase();
  if (!code) return res.json({ valid: false });

  await connectMongo();
  const user = await UserModel.findOne({ referralCode: code }).select('_id').lean();
  return res.json({ valid: Boolean(user) });
}
