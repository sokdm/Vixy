// @ts-nocheck
export const config = { api: { bodyParser: false } };

export default function handler(_req, res) {
  return res.status(501).json({ error: 'Flutterwave webhooks are being reconnected to the Vixy Mongo backend.' });
}
