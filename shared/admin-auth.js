import {
  connectMongo,
  serializeUser,
  UserModel,
  verifySessionToken,
} from '../app/server/mongo.js';

export function getHeader(req, name) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function extractBearerToken(req) {
  const authorization = getHeader(req, 'authorization');
  if (!authorization) return null;
  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function authenticateRequestUser(req) {
  const token = extractBearerToken(req);
  if (!token) return { error: 'Missing Authorization bearer token', status: 401 };

  try {
    await connectMongo();
    const claims = verifySessionToken(token);
    const user = await UserModel.findById(claims.sub);
    if (!user || user.accountStatus === 'suspended') {
      return { error: 'Invalid or suspended account', status: 401 };
    }
    return { user: { ...serializeUser(user), raw: user }, token };
  } catch {
    return { error: 'Invalid or expired access token', status: 401 };
  }
}

export async function getAdminMembership(_db, userId) {
  await connectMongo();
  const user = await UserModel.findById(userId);
  return user?.role === 'admin' ? { role: 'owner', is_active: true } : null;
}

export async function requireAdminContext(req, res) {
  const authResult = await authenticateRequestUser(req);
  if (authResult.error) {
    res.status(authResult.status).json({ error: authResult.error });
    return null;
  }

  const adminMembership = await getAdminMembership(null, authResult.user.id);
  if (!adminMembership) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return { user: authResult.user, admin: adminMembership };
}
