// @ts-nocheck
import { createAdminHandler } from './admin-handler.js';
import ensureUserWalletHandler from './api/ensure-user-wallet.js';
import authHandler from './api/auth.js';
import accountHandler from './api/account.js';
import publicConfigHandler from './api/public-config.js';
import passwordResetHandler from './api/password-reset.js';
import rateHandler from './api/rate.js';
import referralCodeHandler from './api/referral-code.js';
import referralsHandler from './api/referrals.js';
import morphlyTokenHandler from './api/morphly-token.js';
import versionHandler from './api/version.js';
import walletHandler from './api/wallet.js';
import telemetryHandler, { errorLogHandler } from './api/telemetry.js';

function pendingMongoHandler(feature) {
  return async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    return res.status(501).json({
      error: `${feature} is being reconnected to the Vixy Mongo backend.`,
      provider: 'mongodb',
    });
  };
}

const routeHandlers = {
  feedback: pendingMongoHandler('Customer feedback'),
  announcements: pendingMongoHandler('Announcements'),
  'admin-engagement': pendingMongoHandler('Admin engagement'),
  'email-preferences': pendingMongoHandler('Email preferences'),
  'engagement-cron': pendingMongoHandler('Engagement cron'),
  auth: authHandler,
  account: accountHandler,
  'admin-audit-log': createAdminHandler('audit-log'),
  'admin-credit-packages': createAdminHandler('credit-packages'),
  'admin-me': createAdminHandler('me'),
  'admin-overview': createAdminHandler('overview'),
  'admin-referrals': createAdminHandler('referrals'),
  'admin-users': createAdminHandler('users'),
  'admin-transactions': createAdminHandler('transactions'),
  'admin-usage': createAdminHandler('usage'),
  'admin-logs': createAdminHandler('logs'),
  'credit-packages': pendingMongoHandler('Credit packages'),
  'end-session': pendingMongoHandler('Realtime session billing'),
  'ensure-user-wallet': ensureUserWalletHandler,
  'flutterwave-webhook': pendingMongoHandler('Flutterwave webhooks'),
  heartbeat: pendingMongoHandler('Realtime heartbeat billing'),
  'public-config': publicConfigHandler,
  rate: rateHandler,
  'referral-code': referralCodeHandler,
  referrals: referralsHandler,
  'session-status': pendingMongoHandler('Realtime session status'),
  'start-session': morphlyTokenHandler,
  'verify-payment': pendingMongoHandler('Payment verification'),
  'initiate-flutterwave-payment': pendingMongoHandler('Flutterwave checkout'),
  'flutterwave-payment-return': pendingMongoHandler('Flutterwave checkout return'),
  'initiate-crypto-payment': pendingMongoHandler('Crypto checkout'),
  'verify-crypto-payment': pendingMongoHandler('Crypto payment verification'),
  'ivorypay-webhook': pendingMongoHandler('Ivorypay webhooks'),
  'morphly-token': morphlyTokenHandler,
  'password-reset': passwordResetHandler,
  version: versionHandler,
  wallet: walletHandler,
  telemetry: telemetryHandler,
  'error-log': errorLogHandler,
};

function normalizeRouteSegment(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeRouteSegment).filter(Boolean).join('/');
  }

  if (typeof value === 'string') {
    return value.trim().replace(/^\/+|\/+$/g, '');
  }

  return '';
}

function getRouteName(req) {
  const queryRoute = normalizeRouteSegment(req.query?.route);
  if (queryRoute) {
    return queryRoute;
  }

  const requestUrl = req.originalUrl || req.url || '/';
  const url = new URL(requestUrl, 'http://localhost');
  return url.pathname.replace(/^\/api\/?/, '').replace(/^\/+|\/+$/g, '');
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }

  if (req.readable && typeof req.on === 'function' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const rawBuffer = Buffer.concat(chunks);
      if (!req.rawBody) {
        req.rawBody = rawBuffer;
      }
      const rawText = rawBuffer.toString('utf8');
      if (rawText.trim()) {
        return JSON.parse(rawText);
      }
    } catch {
      return {};
    }
  }

  return req.body || {};
}

export async function handleApiRoute(req, res) {
  const routeName = getRouteName(req);
  const routeHandler = routeHandlers[routeName];

  if (!routeHandler) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return res.status(404).json({ error: 'API route not found' });
  }

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.body = await parseRequestBody(req);
  } else if (!req.body) {
    req.body = {};
  }

  return routeHandler(req, res);
}

export default handleApiRoute;
