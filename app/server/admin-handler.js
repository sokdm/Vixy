// @ts-nocheck
import { requireAdminContext } from '../../shared/admin-auth.js';
import {
  AnalyticsEventModel,
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

  return res.json({
    totals: {
      users,
      credits: wallets.reduce((sum, wallet) => sum + Number(wallet.credits || 0), 0),
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
  const [sessions, events] = await Promise.all([
    SessionModel.find().sort({ createdAt: -1 }).limit(250).lean(),
    AnalyticsEventModel.find().sort({ createdAt: -1 }).limit(250).lean(),
  ]);
  return res.json({ sessions, events });
}

async function handleAdminLogs(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (req.method !== 'GET') return methodNotAllowed(res);
  const logs = await ErrorLogModel.find().sort({ lastSeenAt: -1 }).limit(250).lean();
  return res.json({ logs });
}

async function handleNotReady(req, res) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  return res.json({ items: [], message: 'This Vixy admin section is ready for Mongo-backed data.' });
}

const ADMIN_ROUTE_CONFIG = {
  me: { methods: ['GET'], handler: handleAdminMe },
  overview: { methods: ['GET'], handler: handleAdminOverview },
  users: { methods: ['GET', 'POST', 'DELETE'], handler: handleAdminUsers },
  transactions: { methods: ['GET'], handler: handleAdminTransactions },
  usage: { methods: ['GET'], handler: handleAdminUsage },
  logs: { methods: ['GET'], handler: handleAdminLogs },
  'credit-packages': { methods: ['GET', 'POST', 'PUT'], handler: handleNotReady },
  'audit-log': { methods: ['GET'], handler: handleNotReady },
  referrals: { methods: ['GET', 'POST'], handler: handleNotReady },
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
