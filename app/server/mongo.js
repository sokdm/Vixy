// @ts-nocheck
import crypto from 'node:crypto';
import mongoose from 'mongoose';

const DEFAULT_DATABASE_NAME = 'vixy';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
let connectionPromise = null;

function getMongoUri() {
  return String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
}

export const mongoConfigError = getMongoUri() ? null : 'Missing MONGODB_URI';

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    const uri = getMongoUri();
    if (!uri) throw new Error(mongoConfigError);
    connectionPromise = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || DEFAULT_DATABASE_NAME,
      serverSelectionTimeoutMS: 15000,
    });
  }
  return connectionPromise;
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
  referralCode: { type: String, index: true },
  referredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  onboardingCompleted: { type: Boolean, default: false },
  onboardingCompletedAt: { type: Date, default: null },
  onboardingSkippedAt: { type: Date, default: null },
  onboardingVersion: { type: Number, default: 1 },
  signupWelcomeClaimedAt: { type: Date, default: null },
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  credits: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type: { type: String, default: 'manual' },
  status: { type: String, default: 'pending' },
  amountNaira: { type: Number, default: 0 },
  credits: { type: Number, default: 0 },
  reference: { type: String, index: true },
  paymentGateway: { type: String, default: '' },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  provider: { type: String, default: '' },
  model: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  creditsSpent: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

const analyticsEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  eventName: { type: String, required: true },
  installationId: String,
  sessionId: String,
  platform: String,
  acquisitionSource: String,
  metadata: { type: Object, default: {} },
}, { timestamps: true });

const errorLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  fingerprint: { type: String, required: true, unique: true },
  message: String,
  stack: String,
  severity: { type: String, default: 'error' },
  platform: String,
  occurrences: { type: Number, default: 1 },
  lastSeenAt: { type: Date, default: Date.now },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);
export const WalletModel = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
export const SessionModel = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export const AnalyticsEventModel = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', analyticsEventSchema);
export const ErrorLogModel = mongoose.models.ErrorLog || mongoose.model('ErrorLog', errorLogSchema);

function getSessionSecret() {
  return String(process.env.JWT_SECRET || process.env.SESSION_SECRET || '').trim();
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  const [, salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt).split(':')[2];
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function base64url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

export function signSessionToken(user) {
  const secret = getSessionSecret();
  if (!secret) throw new Error('Missing JWT_SECRET');
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    sub: String(user._id),
    email: user.email,
    role: user.role || 'user',
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  });
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifySessionToken(token) {
  const secret = getSessionSecret();
  if (!secret) throw new Error('Missing JWT_SECRET');
  const [header, payload, signature] = String(token || '').split('.');
  if (!header || !payload || !signature) throw new Error('Invalid token');
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid token');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (Number(claims.exp || 0) < Math.floor(Date.now() / 1000)) throw new Error('Expired token');
  return claims;
}

export function serializeUser(user) {
  return {
    id: String(user._id),
    name: user.name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    createdAt: user.createdAt?.toISOString?.() || null,
    isAdmin: user.role === 'admin',
    adminRole: user.role === 'admin' ? 'owner' : null,
  };
}

export async function ensureWallet(userId) {
  await connectMongo();
  await WalletModel.updateOne(
    { userId },
    { $setOnInsert: { userId, credits: 0, balance: 0 } },
    { upsert: true },
  );
  return WalletModel.findOne({ userId }).lean();
}
