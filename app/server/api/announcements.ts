// @ts-nocheck
import { AnnouncementModel, connectMongo } from '../mongo.js';

function serializeAnnouncement(item) {
  return {
    id: String(item._id),
    title: item.title,
    message: item.message,
    kind: item.kind || 'update',
    ends_at: item.endsAt?.toISOString?.() || null,
    revision: Number(item.revision || 1),
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
    const now = new Date();
    const announcements = await AnnouncementModel.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      ],
    }).sort({ createdAt: -1 }).limit(10).lean();

    return res.json({
      serverTime: now.toISOString(),
      announcements: announcements.map(serializeAnnouncement),
    });
  } catch {
    return res.json({ serverTime: new Date().toISOString(), announcements: [] });
  }
}
