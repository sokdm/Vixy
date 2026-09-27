// @ts-nocheck
import { connectMongo, CreditPackageModel } from '../mongo.js';

const DEFAULT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 500, priceNGN: 2500, isActive: true, sortOrder: 10 },
  { id: 'creator', name: 'Creator', credits: 1500, priceNGN: 6500, isActive: true, sortOrder: 20 },
  { id: 'studio', name: 'Studio', credits: 5000, priceNGN: 18000, isActive: true, sortOrder: 30 },
];

function serializePackage(item) {
  return {
    id: String(item._id || item.id),
    name: item.name,
    credits: Number(item.credits || 0),
    priceNGN: Number(item.priceNGN || 0),
    isActive: item.isActive !== false,
    sortOrder: Number(item.sortOrder || 0),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectMongo();
    const packages = await CreditPackageModel.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    return res.json({ packages: (packages.length ? packages : DEFAULT_PACKAGES).map(serializePackage) });
  } catch {
    return res.json({ packages: DEFAULT_PACKAGES });
  }
}
