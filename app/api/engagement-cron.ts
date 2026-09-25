// @ts-nocheck
export default function handler(_req, res) {
  return res.status(501).json({ error: 'Engagement cron is being reconnected to the Vixy Mongo backend.' });
}
