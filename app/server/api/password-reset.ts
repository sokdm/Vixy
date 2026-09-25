// @ts-nocheck
import crypto from 'node:crypto';
import {
  connectMongo,
  hashPassword,
  normalizeEmail,
  UserModel,
} from '../mongo.js';

const resetCodes = new Map();
const verifiedTokens = new Map();

function makeCode() {
  return String(crypto.randomInt(100000, 999999));
}

function makeToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectMongo();
    const action = String(req.body?.action || '').trim();

    if (action === 'request') {
      const email = normalizeEmail(req.body?.email);
      const user = email ? await UserModel.findOne({ email }) : null;
      if (user) {
        const code = makeCode();
        resetCodes.set(email, {
          code,
          userId: String(user._id),
          expiresAt: Date.now() + 15 * 60 * 1000,
        });
        // TODO: send with Nodemailer once SMTP env values are provided.
        console.info(`[password-reset] Vixy reset code for ${email}: ${code}`);
      }
      return res.json({ ok: true });
    }

    if (action === 'verify') {
      const email = normalizeEmail(req.body?.email);
      const code = String(req.body?.code || '').trim();
      const record = resetCodes.get(email);
      if (!record || record.code !== code || record.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'This code is invalid or has expired.' });
      }
      resetCodes.delete(email);
      const resetToken = makeToken();
      verifiedTokens.set(resetToken, {
        userId: record.userId,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      return res.json({ resetToken });
    }

    if (action === 'update') {
      const resetToken = String(req.body?.resetToken || '');
      const password = String(req.body?.password || '');
      const record = verifiedTokens.get(resetToken);
      if (!record || record.expiresAt < Date.now()) {
        return res.status(401).json({ error: 'Your recovery session expired. Request a new code to continue.' });
      }
      if (password.length < 8) return res.status(400).json({ error: 'Use at least eight characters for your new password.' });
      await UserModel.updateOne({ _id: record.userId }, { $set: { passwordHash: hashPassword(password) } });
      verifiedTokens.delete(resetToken);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unsupported password reset action' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Password reset failed' });
  }
}
