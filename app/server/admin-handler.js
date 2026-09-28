// @ts-nocheck
import { requireAdminContext } from '../../shared/admin-auth.js';
import {
  AnalyticsEventModel,
  CreditPackageModel,
  connectMongo,
  ErrorLogModel,
  SessionModel,
  TransactionModel,
  UserModel,
  WalletModel,
} from './mongo.js';

function methodNotAllowed(res) {
  return res.status(405).json({ error: 'Method not allowed' });
}

async function requireAdmin(req, res) {
  await connectMongo();
  return requireAdminContext(req, res);
}

async function handleAdminMe(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  return res.json({ user: admin.user, membership: admin.membership });
}

async function handleAdminOverview(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const [users, wallets, sessions, transactions, errors] = await Promise.all([
    UserModel.countDocuments(),
    WalletModel.find().lean(),
    SessionModel.find().sort({ createdAt: -1 }).limit(20).lean(),
    TransactionModel.find().sort({ createdAt: -1 }).limit(20).lean(),
    ErrorLogModel.find().sort({ lastSeenAt: -1 }).limit(20).lean(),
  ]);
  const blockedUsers = await UserModel.countDocuments({ accountStatus: 'suspended' });
  const totalCredits = wallets.reduce((sum, wallet) => sum + Number(wallet.credits || 0), 0);
  const revenueNGN = transactions
    .filter((transaction) => ['successful', 'success', 'completed', 'paid'].includes(String(transaction.status || '').toLowerCase()))
    .reduce((sum, transaction) => sum + Number(transaction.amountNaira || 0), 0);
  const activeSessions = sessions.filter((session) => String(session.status || '').toLowerCase() === 'active').length;

  return res.json({
    totalUsers: users,
    blockedUsers,
    totalCredits,
    revenueNGN,
    activeSessions,
    totals: {
      users,
      blockedUsers,
      credits: totalCredits,
      revenueNGN,
      activeSessions,
      sessions: sessions.length,
      transactions: transactions.length,
      errors: errors.length,
    },
    recentSessions: sessions,
    recentTransactions: transactions,
    recentErrors: errors,
  });
}

async function handleAdminUsers(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const users = await UserModel.find().sort({ createdAt: -1 }).limit(250).lean();
    const wallets = await WalletModel.find({ userId: { $in: users.map((user) => user._id) } }).lean();
    const walletByUser = new Map(wallets.map((wallet) => [String(wallet.userId), wallet]));
    return res.json({
      users: users.map((user) => ({
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
        accountStatus: user.accountStatus,
        credits: walletByUser.get(String(user._id))?.credits || 0,
        createdAt: user.createdAt,
      })),
    });
  }

  if (req.method === 'POST') {
    if (req.body?.action === 'credits') {
      const userId = req.body?.userId || req.body?.id;
      const adjustment = Number(req.body?.adjustment || 0);
      if (!userId) return res.status(400).json({ error: 'Missing userId' });
      if (!Number.isSafeInteger(adjustment) || adjustment === 0 || Math.abs(adjustment) > 1_000_000) {
        return res.status(400).json({ error: 'Invalid credit adjustment' });
      }
      if (adjustment < 0 && admin.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can deduct credits' });
      }

      const wallet = await WalletModel.findOneAndUpdate(
        { userId },
        { $inc: { credits: adjustment, balance: adjustment } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();
      if (Number(wallet.credits || 0) < 0) {
        await WalletModel.updateOne({ userId }, { $inc: { credits: -adjustment, balance: -adjustment } });
        return res.status(400).json({ error: 'User does not have enough credits' });
      }
      await TransactionModel.create({
        userId,
        type: adjustment > 0 ? 'admin_credit_grant' : 'admin_credit_deduction',
        status: 'completed',
        amountNaira: 0,
        credits: adjustment,
        reference: req.body?.idempotencyKey || `admin-${Date.now()}`,
        paymentGateway: 'admin',
        metadata: {
          reason: req.body?.reason || '',
          adminUserId: String(admin.user?._id || ''),
        },
      });
      return res.json({
        newCredits: Number(wallet.credits || 0),
        adjustment,
        creditsAdded: adjustment > 0 ? adjustment : 0,
        creditsDeducted: adjustment < 0 ? Math.abs(adjustment) : 0,
      });
    }

    const userId = req.body?.userId || req.body?.id;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const update = {};
    if (req.body?.accountStatus) update.accountStatus = req.body.accountStatus;
    if (req.body?.role) update.role = req.body.role;
    const user = await UserModel.findByIdAndUpdate(userId, update, { new: true }).lean();
    return res.json({ user });
  }

  if (req.method === 'DELETE') {
    const userId = req.query?.userId || req.body?.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    await Promise.all([
      UserModel.deleteOne({ _id: userId }),
      WalletModel.deleteOne({ userId }),
      TransactionModel.deleteMany({ userId }),
      SessionModel.deleteMany({ userId }),
    ]);
    return res.json({ deleted: true });
  }

  return methodNotAllowed(res);
}

async function handleAdminTransactions(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  const transactions = await TransactionModel.find().sort({ createdAt: -1 }).limit(250).lean();
  return res.json({ transactions });
}

async function handleAdminUsage(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  const [sessions, events, users, wallets] = await Promise.all([
    SessionModel.find().sort({ createdAt: -1 }).limit(250).lean(),
    AnalyticsEventModel.find().sort({ createdAt: -1 }).limit(250).lean(),
    UserModel.find().sort({ createdAt: -1 }).limit(250).lean(),
    WalletModel.find().lean(),
  ]);
  const walletByUser = new Map(wallets.map((wallet) => [String(wallet.userId), wallet]));
  const sessionsByUser = new Map();
  for (const session of sessions) {
    const userId = String(session.userId || 'unknown');
    const current = sessionsByUser.get(userId) || {
      userId,
      email: 'Unknown user',
      isAdmin: false,
      walletCredits: 0,
      explainedCreditGrants: 0,
      unexplainedBalanceCredits: 0,
      sessions: 0,
      activeSessions: 0,
      tokenMints: 0,
      auditedTokenMints: 0,
      recordedSeconds: 0,
      recordedCredits: 0,
      untrackedExposureSeconds: 0,
      untrackedExposureCredits: 0,
      installationIds: [],
      installationCount: 0,
      suspicious: false,
      suspiciousReasons: [],
      lastActivityAt: null,
    };
    const status = String(session.status || '').toLowerCase();
    current.sessions += 1;
    if (status === 'active') current.activeSessions += 1;
    current.recordedCredits += Number(session.creditsSpent || 0);
    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : 0;
    const endedAt = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
    if (startedAt && endedAt > startedAt) current.recordedSeconds += Math.floor((endedAt - startedAt) / 1000);
    const lastActivity = session.updatedAt || session.endedAt || session.startedAt || session.createdAt;
    if (lastActivity && (!current.lastActivityAt || new Date(lastActivity) > new Date(current.lastActivityAt))) {
      current.lastActivityAt = new Date(lastActivity).toISOString();
    }
    sessionsByUser.set(userId, current);
  }

  for (const user of users) {
    const userId = String(user._id);
    const walletCredits = Number(walletByUser.get(userId)?.credits || 0);
    const current = sessionsByUser.get(userId) || {
      userId,
      sessions: 0,
      activeSessions: 0,
      tokenMints: 0,
      auditedTokenMints: 0,
      recordedSeconds: 0,
      recordedCredits: 0,
      untrackedExposureSeconds: 0,
      untrackedExposureCredits: 0,
      installationIds: [],
      installationCount: 0,
      suspicious: false,
      suspiciousReasons: [],
      lastActivityAt: user.updatedAt?.toISOString?.() || user.createdAt?.toISOString?.() || null,
    };
    current.email = user.email || 'Unknown user';
    current.isAdmin = user.role === 'admin';
    current.walletCredits = walletCredits;
    current.unexplainedBalanceCredits = walletCredits;
    sessionsByUser.set(userId, current);
  }

  const usageUsers = [...sessionsByUser.values()].sort((a, b) => Number(b.recordedCredits || 0) - Number(a.recordedCredits || 0));
  const totals = usageUsers.reduce((sum, item) => ({
    users: sum.users + 1,
    sessions: sum.sessions + Number(item.sessions || 0),
    activeSessions: sum.activeSessions + Number(item.activeSessions || 0),
    recordedSeconds: sum.recordedSeconds + Number(item.recordedSeconds || 0),
    recordedCredits: sum.recordedCredits + Number(item.recordedCredits || 0),
    untrackedExposureSeconds: sum.untrackedExposureSeconds + Number(item.untrackedExposureSeconds || 0),
    untrackedExposureCredits: sum.untrackedExposureCredits + Number(item.untrackedExposureCredits || 0),
    usersWithUsageGaps: sum.usersWithUsageGaps + (Number(item.untrackedExposureCredits || 0) > 0 ? 1 : 0),
    auditedTokenMints: sum.auditedTokenMints + Number(item.auditedTokenMints || 0),
  }), {
    users: 0,
    sessions: 0,
    activeSessions: 0,
    recordedSeconds: 0,
    recordedCredits: 0,
    untrackedExposureSeconds: 0,
    untrackedExposureCredits: 0,
    usersWithUsageGaps: 0,
    auditedTokenMints: 0,
  });

  return res.json({
    periodDays: 30,
    since: null,
    asOf: new Date().toISOString(),
    totals,
    users: usageUsers,
    dataHealth: {
      analyticsAvailable: events.length > 0,
      walletLedgerAvailable: wallets.length > 0,
      tokenAuditEnabled: false,
    },
  });
}

async function handleAdminLogs(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  const logs = await ErrorLogModel.find().sort({ lastSeenAt: -1 }).limit(250).lean();
  return res.json({ logs });
}

async function handleAdminAuditLog(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  const limit = Math.min(250, Math.max(1, Number(req.query?.limit || 50)));
  const [errors, transactions, events] = await Promise.all([
    ErrorLogModel.find().sort({ lastSeenAt: -1 }).limit(limit).lean(),
    TransactionModel.find().sort({ createdAt: -1 }).limit(limit).lean(),
    AnalyticsEventModel.find().sort({ createdAt: -1 }).limit(limit).lean(),
  ]);
  const entries = [
    ...errors.map((entry) => ({
      timestamp: entry.lastSeenAt || entry.updatedAt || entry.createdAt,
      channel: 'error',
      event: entry.message || 'Error captured',
      occurrences: entry.occurrences || 1,
      severity: entry.severity || 'error',
    })),
    ...transactions.map((entry) => ({
      timestamp: entry.createdAt || entry.updatedAt,
      channel: 'payment',
      event: entry.type || 'Transaction',
      status: entry.status,
      credits: entry.credits,
      amountNaira: entry.amountNaira,
      reference: entry.reference,
    })),
    ...events.map((entry) => ({
      timestamp: entry.createdAt || entry.updatedAt,
      channel: 'analytics',
      event: entry.eventName || 'Analytics event',
      installationId: entry.installationId,
      sessionId: entry.sessionId,
    })),
  ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)).slice(0, limit);
  return res.json({ entries });
}

async function handleAdminReferrals(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method === 'POST') {
    return res.json({ ok: true, message: 'Referral audit recorded.' });
  }

  const users = await UserModel.find().sort({ createdAt: -1 }).limit(500).lean();
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const referredUsers = users.filter((user) => user.referredByUserId);
  const referrals = referredUsers.map((user) => {
    const referrer = userById.get(String(user.referredByUserId));
    return {
      id: String(user._id),
      referralCodeUsed: referrer?.referralCode || '',
      referrerEmail: referrer?.email || 'Unknown referrer',
      referrerCode: referrer?.referralCode || null,
      referredEmail: user.email || 'Unknown referred user',
      status: 'registered',
      registeredAt: user.createdAt || null,
      rewardedAt: null,
      disqualificationReason: null,
      refundWarning: false,
      suspicious: false,
      suspiciousReason: null,
      firstQualifyingPurchase: null,
      rewardTransaction: null,
    };
  });
  return res.json({
    referrals,
    totals: {
      registrations: referrals.length,
      waitingForPurchase: referrals.length,
      rewarded: 0,
      disqualified: 0,
      referralCreditsIssued: 0,
      signupBonusesIssued: 0,
      signupBonusCreditsIssued: 0,
      suspicious: 0,
    },
    audit: [],
  });
}

function serializeCreditPackage(item) {
  return {
    id: String(item._id),
    name: item.name,
    credits: Number(item.credits || 0),
    priceNGN: Number(item.priceNGN || 0),
    isActive: item.isActive !== false,
    sortOrder: Number(item.sortOrder || 0),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function handleAdminCreditPackages(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const packages = await CreditPackageModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return res.json({ packages: packages.map(serializeCreditPackage) });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    if (Array.isArray(req.body?.packages)) {
      const savedPackages = [];
      for (const item of req.body.packages) {
        const update = {
          name: String(item?.name || '').trim(),
          credits: Number(item?.credits || 0),
          priceNGN: Number(item?.priceNGN ?? item?.price_ngn ?? 0),
          isActive: item?.isActive ?? item?.is_active ?? true,
          sortOrder: Number(item?.sortOrder ?? item?.sort_order ?? 0),
        };
        if (!update.name || update.credits <= 0 || update.priceNGN < 0) continue;
        const saved = item?.id
          ? await CreditPackageModel.findByIdAndUpdate(item.id, { $set: update }, { new: true, upsert: false })
          : await CreditPackageModel.create(update);
        if (saved) savedPackages.push(serializeCreditPackage(saved));
      }
      const packages = await CreditPackageModel.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
      return res.json({ packages: packages.map(serializeCreditPackage), saved: savedPackages.length });
    }

    const id = req.body?.id || req.body?.packageId;
    const update = {
      name: String(req.body?.name || '').trim(),
      credits: Number(req.body?.credits || 0),
      priceNGN: Number(req.body?.priceNGN ?? req.body?.price_ngn ?? 0),
      isActive: req.body?.isActive ?? req.body?.is_active ?? true,
      sortOrder: Number(req.body?.sortOrder ?? req.body?.sort_order ?? 0),
    };

    if (!update.name) return res.status(400).json({ error: 'Package name is required' });
    if (update.credits <= 0) return res.status(400).json({ error: 'Credits must be greater than zero' });
    if (update.priceNGN < 0) return res.status(400).json({ error: 'Price must be zero or greater' });

    const saved = id
      ? await CreditPackageModel.findByIdAndUpdate(id, { $set: update }, { new: true, upsert: false })
      : await CreditPackageModel.create(update);

    return res.json({ package: serializeCreditPackage(saved) });
  }

  return methodNotAllowed(res);
}

const ADMIN_ROUTE_CONFIG = {
  me: { methods: ['GET'], handler: handleAdminMe },
  overview: { methods: ['GET'], handler: handleAdminOverview },
  users: { methods: ['GET', 'POST', 'DELETE'], handler: handleAdminUsers },
  transactions: { methods: ['GET'], handler: handleAdminTransactions },
  usage: { methods: ['GET'], handler: handleAdminUsage },
  logs: { methods: ['GET'], handler: handleAdminLogs },
  'credit-packages': { methods: ['GET', 'POST', 'PUT'], handler: handleAdminCreditPackages },
  'audit-log': { methods: ['GET'], handler: handleAdminAuditLog },
  referrals: { methods: ['GET', 'POST'], handler: handleAdminReferrals },
};

export function createAdminHandler(routeName) {
  const config = ADMIN_ROUTE_CONFIG[routeName];
  if (!config) throw new Error(`Unknown admin route: ${routeName}`);

  return async function adminHandler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', `${config.methods.join(', ')}, OPTIONS`);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!config.methods.includes(req.method)) return methodNotAllowed(res);

    try {
      return await config.handler(req, res);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Admin request failed' });
    }
  };
}

export function handleAdminRoute(routeName, req, res) {
  return createAdminHandler(routeName)(req, res);
}
