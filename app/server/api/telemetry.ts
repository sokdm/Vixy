// @ts-nocheck
import crypto from 'crypto';
import { authenticateRequestUser } from '../../../shared/admin-auth.js';
import { AnalyticsEventModel, connectMongo, ErrorLogModel } from '../mongo.js';

const EVENTS = new Set(['download_clicked', 'first_app_open', 'signup_started', 'signup_completed', 'login_success', 'payment_started', 'payment_succeeded', 'payment_failed', 'xmax_key_requested', 'connection_started', 'connection_failed', 'first_frame_received', 'session_completed', 'session_disconnected']);
const SAFE_METADATA_KEYS = new Set(['mode', 'stage', 'reason', 'durationMs', 'latencyMs', 'source', 'networkType']);
const text = (value, max = 100) => typeof value === 'string' ? value.trim().slice(0, max) : null;
const safeMetadata = (input) => Object.fromEntries(Object.entries(input && typeof input === 'object' ? input : {}).filter(([key, value]) => SAFE_METADATA_KEYS.has(key) && ['string', 'number', 'boolean'].includes(typeof value)).slice(0, 20));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await connectMongo();
  const eventName = text(req.body?.eventName);
  if (!EVENTS.has(eventName)) return res.status(400).json({ error: 'Unsupported event' });
  const auth = await authenticateRequestUser(req).catch(() => ({ error: true }));

  await AnalyticsEventModel.create({
    userId: auth.error ? null : auth.user.id,
    eventName,
    installationId: text(req.body?.installationId),
    sessionId: req.body?.sessionId || null,
    platform: text(req.body?.platform, 30),
    acquisitionSource: text(req.body?.acquisitionSource, 60),
    metadata: { ...safeMetadata(req.body?.metadata), appVersion: text(req.body?.appVersion, 30) },
  });
  return res.status(202).json({ recorded: true });
}

export async function errorLogHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await connectMongo();
  const auth = await authenticateRequestUser(req).catch(() => ({ error: true }));
  const errorCode = text(req.body?.errorCode, 80) || 'UNKNOWN';
  const stage = text(req.body?.providerStage, 60);
  const platform = text(req.body?.platform, 30);
  const fingerprint = crypto.createHash('sha256').update(`${errorCode}|${stage}|${platform}`).digest('hex');

  const existing = await ErrorLogModel.findOne({ fingerprint }).lean();
  await ErrorLogModel.updateOne(
    { fingerprint },
    {
      $set: {
        userId: auth.error ? null : auth.user.id,
        message: text(req.body?.safeMessage, 240) || 'Application error',
        stack: text(req.body?.stack, 2000),
        severity: ['info', 'warning', 'error', 'critical'].includes(req.body?.severity) ? req.body.severity : 'error',
        platform,
        lastSeenAt: new Date(),
        metadata: {
          errorCode,
          sessionId: req.body?.sessionId || null,
          osVersion: text(req.body?.osVersion, 50),
          appVersion: text(req.body?.appVersion, 30),
          networkType: text(req.body?.networkType, 30),
          providerStage: stage,
          requestLatencyMs: Number.isSafeInteger(req.body?.requestLatencyMs) ? Math.max(0, req.body.requestLatencyMs) : null,
          ...safeMetadata(req.body?.metadata),
        },
      },
      $setOnInsert: { fingerprint },
      $inc: { occurrences: existing ? 1 : 0 },
    },
    { upsert: true },
  );
  if (!existing) await ErrorLogModel.updateOne({ fingerprint }, { $set: { occurrences: 1 } });
  return res.status(202).json({ recorded: true });
}
