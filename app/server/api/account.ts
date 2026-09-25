// @ts-nocheck
import { authenticateRequestUser } from '../../../shared/admin-auth.js';
import { logErrorEvent, logRequestEvent } from '../../../shared/backend-logger.js';
import { connectMongo, ensureWallet, UserModel, WalletModel } from '../mongo.js';

const CURRENT_ONBOARDING_VERSION = 1;
const SIGNUP_WELCOME_CREDITS = Number(process.env.SIGNUP_WELCOME_CREDITS || 0);

function serializeOnboarding(profile) {
  return {
    completed: Boolean(profile?.onboardingCompleted),
    completedAt: profile?.onboardingCompletedAt?.toISOString?.() || null,
    skippedAt: profile?.onboardingSkippedAt?.toISOString?.() || null,
    version: Number(profile?.onboardingVersion || CURRENT_ONBOARDING_VERSION),
    currentVersion: CURRENT_ONBOARDING_VERSION,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  try {
    await connectMongo();
    const authResult = await authenticateRequestUser(req);
    if (authResult.error) return res.status(authResult.status).json({ error: authResult.error });
    const userId = authResult.user.id;

    if (req.method === 'POST' && req.body?.action === 'claim-signup-welcome') {
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const showWelcome = !user.signupWelcomeClaimedAt;
      if (showWelcome) {
        user.signupWelcomeClaimedAt = new Date();
        await user.save();
        if (SIGNUP_WELCOME_CREDITS > 0) {
          await ensureWallet(userId);
          await WalletModel.updateOne({ userId }, { $inc: { credits: SIGNUP_WELCOME_CREDITS } });
        }
      }
      return res.json({ showWelcome });
    }

    if (req.method === 'POST') {
      const action = String(req.body?.action || '').trim();
      const now = new Date();
      const update = {};

      if (action === 'complete') {
        Object.assign(update, { onboardingCompleted: true, onboardingCompletedAt: now, onboardingSkippedAt: null, onboardingVersion: CURRENT_ONBOARDING_VERSION });
      } else if (action === 'skip') {
        Object.assign(update, { onboardingCompleted: true, onboardingCompletedAt: now, onboardingSkippedAt: now, onboardingVersion: CURRENT_ONBOARDING_VERSION });
      } else if (action === 'restart') {
        Object.assign(update, { onboardingCompleted: false, onboardingCompletedAt: null, onboardingSkippedAt: null, onboardingVersion: CURRENT_ONBOARDING_VERSION });
      } else {
        return res.status(400).json({ error: 'Unsupported account action' });
      }

      const user = await UserModel.findByIdAndUpdate(userId, update, { new: true });
      await logRequestEvent('account.onboarding_updated', { userId, action, onboardingVersion: CURRENT_ONBOARDING_VERSION });
      return res.json({ onboarding: serializeOnboarding(user) });
    }

    const user = await UserModel.findById(userId).lean();
    return res.json({ onboarding: serializeOnboarding(user) });
  } catch (error) {
    await logErrorEvent('account.exception', error, { method: req.method });
    return res.status(500).json({ error: 'Failed to load account onboarding state' });
  }
}
