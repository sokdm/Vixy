// @ts-nocheck
import {
  connectMongo,
  ensureWallet,
  hashPassword,
  normalizeEmail,
  serializeUser,
  signSessionToken,
  UserModel,
  verifyPassword,
} from '../mongo.js';
import { authenticateRequestUser } from '../../../shared/admin-auth.js';

function sendAuth(res, user) {
  const token = signSessionToken(user);
  return res.json({ token, user: serializeUser(user) });
}

async function ensureEnvAdmin() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = String(process.env.ADMIN_PASSWORD || '').trim();
  if (!email || !password) return;

  const existing = await UserModel.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    await ensureWallet(existing._id);
    return;
  }

  const admin = await UserModel.create({
    email,
    name: process.env.ADMIN_NAME || 'Vixy Admin',
    passwordHash: hashPassword(password),
    role: 'admin',
  });
  await ensureWallet(admin._id);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectMongo();
    await ensureEnvAdmin();
  } catch (error) {
    return res.status(503).json({ error: error?.message || 'MongoDB is not configured' });
  }

  const action = String(req.query?.action || req.body?.action || '').trim();

  try {
    if (req.method === 'GET' || action === 'me') {
      const auth = await authenticateRequestUser(req);
      if (auth.error) return res.status(auth.status).json({ error: auth.error });
      return res.json({ user: auth.user });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (action === 'logout') return res.json({ ok: true });

    if (action === 'login') {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || '');
      const user = await UserModel.findOne({ email });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({ error: 'This account is suspended' });
      }
      await ensureWallet(user._id);
      return sendAuth(res, user);
    }

    if (action === 'register') {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || '');
      const name = String(req.body?.name || '').trim();
      if (!email || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required' });
      if (name.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      const existing = await UserModel.findOne({ email });
      if (existing) return res.status(409).json({ error: 'An account already exists for this email.' });

      const user = await UserModel.create({
        email,
        name,
        passwordHash: hashPassword(password),
        role: normalizeEmail(process.env.ADMIN_EMAIL) === email ? 'admin' : 'user',
      });
      await ensureWallet(user._id);
      return sendAuth(res, user);
    }

    return res.status(400).json({ error: 'Unsupported auth action' });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Authentication failed' });
  }
}
