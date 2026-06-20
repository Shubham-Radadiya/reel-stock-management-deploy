const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Local: backend/.env or repo-root .env. Production (Render, etc.): set vars in the host dashboard
// (dotenv does not override variables already set by the host)
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] UnhandledRejection:', reason);
  if (reason && typeof reason === 'object' && 'stack' in reason && reason.stack) {
    console.error(reason.stack);
  }
});
process.on('uncaughtException', (err) => {
  console.error('[fatal] UncaughtException:', err);
  process.exit(1);
});

const app = express();
const parsedPort = parseInt(process.env.PORT, 10);
const PORT = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000;
const MONGO_URI = process.env.MONGO_URI;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const getJwtSecret = () =>
  process.env.JWT_SECRET != null ? String(process.env.JWT_SECRET).trim() : '';

/** In production, require a real secret (Render should set NODE_ENV=production via npm run live). */
const isProductionJwtReady = () => {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  const s = getJwtSecret();
  return Boolean(s) && s !== 'dev-secret-change-me';
};

const jwtSecretForAuth = () => {
  const s = getJwtSecret();
  return s || 'dev-secret-change-me';
};

app.use(cors());
app.use(express.json());

/** Avoid 502 when Mongo is slow or misconfigured: keep HTTP up; API returns 503 until DB connects. */
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }
  if (req.path === '/api/health') {
    return next();
  }
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  return res.status(503).json({
    message:
      'Database is not available. On Render: check MONGO_URI and Atlas → Network Access (allow 0.0.0.0/0 for testing).',
    mongoReadyState: mongoose.connection.readyState
  });
});

app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return next();
  }
  if (req.path === '/api/health') {
    return next();
  }
  if (!isProductionJwtReady()) {
    return res.status(503).json({
      message:
        'Server auth is not configured. On Render: set JWT_SECRET (long random string, not dev-secret-change-me).'
    });
  }
  return next();
});

const accessShape = {
  reports: { type: Boolean, default: false },
  matrix: { type: Boolean, default: false },
  analytics: { type: Boolean, default: false },
  reelchart: { type: Boolean, default: false },
  minimum: { type: Boolean, default: false }
};

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    /** Visible to admin only (set on create / password reset). */
    plainPassword: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    access: accessShape
  },
  { timestamps: true }
);

const fullAccess = () => ({
  reports: true,
  matrix: true,
  analytics: true,
  reelchart: true,
  minimum: true
});

const defaultUserAccess = () => ({
  reports: true,
  matrix: true,
  analytics: false,
  reelchart: false,
  minimum: false
});

const legacyUserAccess = () => defaultUserAccess();

const resolveUserAccess = (user) => {
  if (user?.role === 'admin') return fullAccess();
  const a = user?.access;
  if (a && typeof a === 'object' && ('reports' in a || 'matrix' in a)) {
    return {
      reports: Boolean(a.reports),
      matrix: Boolean(a.matrix),
      analytics: Boolean(a.analytics),
      reelchart: Boolean(a.reelchart),
      minimum: Boolean(a.minimum)
    };
  }
  return legacyUserAccess();
};

const reelSchema = new mongoose.Schema(
  {
    date: { type: String, default: '' },
    srNo: { type: String, default: '' },
    reelNo: { type: String, default: '' },
    shade: { type: String, default: '' },
    bf: { type: String, default: '' },
    gsm: { type: String, default: '' },
    size: { type: String, default: '' },
    weight: { type: String, default: '' },
    isCheckedOut: { type: Boolean, default: false },
    outDate: { type: String, default: '' }
  },
  { timestamps: true }
);

reelSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

reelSchema.index({ date: -1, createdAt: -1 });
reelSchema.index({ isCheckedOut: 1 });
reelSchema.index({ size: 1, shade: 1, bf: 1, gsm: 1 });

const leanReelToJson = (doc) => {
  const { _id, __v, ...rest } = doc;
  return { ...rest, id: _id.toString() };
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const ret = this.toObject();
  ret.id = ret._id.toString();
  delete ret._id;
  delete ret.__v;
  delete ret.passwordHash;
  delete ret.plainPassword;
  ret.access = resolveUserAccess(this);
  return ret;
};

userSchema.methods.toAdminJSON = function toAdminJSON() {
  const ret = this.toSafeJSON();
  ret.plainPassword = this.plainPassword || '';
  return ret;
};

userSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.plainPassword;
    return ret;
  }
});

const stockMinimumSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    gsm: { type: String, required: true, trim: true },
    minReels: { type: Number, required: true, min: 0 }
  },
  { timestamps: true }
);

stockMinimumSchema.index({ size: 1, gsm: 1 }, { unique: true });

stockMinimumSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
const Reel = mongoose.model('Reel', reelSchema);
const StockMinimum = mongoose.model('StockMinimum', stockMinimumSchema);

/** Mongoose Connection#readyState — helps interpret /api/health without looking up numbers. */
const mongoPhase = () =>
  ({
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }[mongoose.connection.readyState] || 'unknown');

const MONGOOSE_CONNECT_OPTS = {
  serverSelectionTimeoutMS: 12_000,
  connectTimeoutMS: 12_000,
  maxPoolSize: 10
};

const createToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      email: user.email || '',
      role: user.role,
      access: resolveUserAccess(user)
    },
    jwtSecretForAuth(),
    { expiresIn: '7d' }
  );

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' });
  }

  try {
    const payload = jwt.verify(token, jwtSecretForAuth());
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Invalid auth token' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid auth token' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
};

const seedInitialData = async () => {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin@123';
  const defaultUsername = process.env.DEFAULT_USERNAME || 'user';
  const defaultUserEmail = process.env.DEFAULT_USER_EMAIL || 'user@example.com';
  const defaultUserPassword = process.env.DEFAULT_USER_PASSWORD || 'user@123';

  // Backfill role for older users created before role support.
  const usersWithoutRole = await User.find({
    $or: [{ role: { $exists: false } }, { role: null }, { role: '' }]
  });
  for (const user of usersWithoutRole) {
    user.role = user.username === adminUsername ? 'admin' : 'user';
    await user.save();
  }

  let adminUser = await User.findOne({ username: adminUsername });
  if (!adminUser) {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await User.create({
      username: adminUsername,
      email: adminEmail,
      passwordHash: adminHash,
      plainPassword: adminPassword,
      role: 'admin',
      access: fullAccess()
    });
  } else {
    if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
    }
    adminUser.access = fullAccess();
    if (!adminUser.plainPassword) {
      adminUser.plainPassword = adminPassword;
    }
    await adminUser.save();
  }

  const defaultUser = await User.findOne({ username: defaultUsername });
  if (!defaultUser) {
    const defaultUserHash = await bcrypt.hash(defaultUserPassword, 10);
    await User.create({
      username: defaultUsername,
      email: defaultUserEmail,
      passwordHash: defaultUserHash,
      plainPassword: defaultUserPassword,
      role: 'user',
      access: legacyUserAccess()
    });
  } else {
    if (!defaultUser.plainPassword) {
      defaultUser.plainPassword = defaultUserPassword;
    }
    if (!defaultUser.access) {
      defaultUser.access = legacyUserAccess();
    }
    await defaultUser.save();
  }

  const usersMissingPlain = await User.find({
    $or: [
      { plainPassword: { $exists: false } },
      { plainPassword: null },
      { plainPassword: '' }
    ]
  });
  for (const u of usersMissingPlain) {
    if (u.username === adminUsername) {
      u.plainPassword = adminPassword;
      await u.save();
    } else if (u.username === defaultUsername) {
      u.plainPassword = defaultUserPassword;
      await u.save();
    }
  }

  const usersMissingAccess = await User.find({
    role: { $ne: 'admin' },
    $or: [{ access: { $exists: false } }, { access: null }]
  });
  for (const u of usersMissingAccess) {
    u.access = legacyUserAccess();
    await u.save();
  }

  const reelCount = await Reel.countDocuments();
  if (reelCount === 0 && fs.existsSync(DB_PATH)) {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(raw);
    if (Array.isArray(db.reels) && db.reels.length > 0) {
      await Reel.insertMany(db.reels);
    }
  }
};

app.get('/api/health', (req, res) => {
  const rs = mongoose.connection.readyState;
  const phase = mongoPhase();
  const dbOk = rs === 1;
  res.json({
    ok: true,
    message: 'API is running',
    database: dbOk ? 'connected' : phase,
    mongoReadyState: rs,
    mongoPhase: phase,
    configuration: {
      hasMongoUri: Boolean(MONGO_URI),
      productionJwtReady: isProductionJwtReady(),
      nodeEnv: process.env.NODE_ENV || ''
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      password.length === 0
    ) {
      return res
        .status(400)
        .json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const hash = user.passwordHash;
    if (typeof hash !== 'string' || !hash.startsWith('$2')) {
      console.error(
        '[login] User has no bcrypt passwordHash; reset user in DB or re-seed admin.'
      );
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    return res.json({
      message: 'Login successful',
      token: createToken(user),
      user: user.toSafeJSON()
    });
  } catch (err) {
    console.error('[login]', err && err.message ? err.message : err);
    if (err && err.stack) {
      console.error(err.stack);
    }
    return res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

app.get('/api/users', authenticate, authorizeAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map((u) => u.toAdminJSON()));
});

app.post('/api/users', authenticate, authorizeAdmin, async (req, res) => {
  const { username, email, password, role, access } = req.body;
  const trimmedUsername = typeof username === 'string' ? username.trim() : '';

  if (!trimmedUsername || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const existing = await User.findOne({ username: trimmedUsername });
  if (existing) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  const trimmedEmail =
    typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;
  if (trimmedEmail) {
    const emailTaken = await User.findOne({ email: trimmedEmail });
    if (emailTaken) {
      return res.status(409).json({ message: 'Email already in use' });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isAdmin = role === 'admin';
  const newUser = await User.create({
    username: trimmedUsername,
    ...(trimmedEmail ? { email: trimmedEmail } : {}),
    passwordHash,
    plainPassword: String(password),
    role: isAdmin ? 'admin' : 'user',
    access: isAdmin
      ? fullAccess()
      : access && typeof access === 'object'
        ? {
            reports: Boolean(access.reports),
            matrix: Boolean(access.matrix),
            analytics: Boolean(access.analytics),
            reelchart: Boolean(access.reelchart),
            minimum: Boolean(access.minimum)
          }
        : defaultUserAccess()
  });

  res.status(201).json(newUser.toAdminJSON());
});

app.put('/api/users/:id/access', authenticate, authorizeAdmin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ message: 'Admin access cannot be changed here' });
  }

  const { access } = req.body || {};
  user.access = {
    reports: Boolean(access?.reports),
    matrix: Boolean(access?.matrix),
    analytics: Boolean(access?.analytics),
    reelchart: Boolean(access?.reelchart),
    minimum: Boolean(access?.minimum)
  };
  if (user.access.reports) {
    if (
      !user.access.matrix &&
      !user.access.analytics &&
      !user.access.reelchart &&
      !user.access.minimum
    ) {
      user.access.matrix = true;
    }
  } else {
    user.access.matrix = false;
    user.access.analytics = false;
    user.access.reelchart = false;
    user.access.minimum = false;
  }

  await user.save();
  res.json(user.toAdminJSON());
});

app.put('/api/users/:id/password', authenticate, authorizeAdmin, async (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ message: 'password is required' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const nextPassword = password.trim();
  user.passwordHash = await bcrypt.hash(nextPassword, 10);
  user.plainPassword = nextPassword;
  await user.save();
  res.json(user.toAdminJSON());
});

app.get('/api/stock-minimums', authenticate, async (req, res) => {
  const items = await StockMinimum.find().sort({ size: 1, gsm: 1 });
  res.json(items.map((item) => item.toJSON()));
});

app.post('/api/stock-minimums', authenticate, authorizeAdmin, async (req, res) => {
  const size = String(req.body.size || '').trim();
  const gsm = String(req.body.gsm || '').trim();
  const minReels = parseInt(req.body.minReels, 10);

  if (!size || !gsm) {
    return res.status(400).json({ message: 'size and gsm are required' });
  }
  if (!Number.isFinite(minReels) || minReels < 0) {
    return res.status(400).json({ message: 'minReels must be a non-negative number' });
  }

  try {
    const item = await StockMinimum.create({ size, gsm, minReels });
    return res.status(201).json(item.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: 'Minimum stock already exists for this Size + GSM' });
    }
    throw err;
  }
});

app.put('/api/stock-minimums/:id', authenticate, authorizeAdmin, async (req, res) => {
  const item = await StockMinimum.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Minimum stock rule not found' });
  }

  const size =
    req.body.size != null ? String(req.body.size).trim() : item.size;
  const gsm = req.body.gsm != null ? String(req.body.gsm).trim() : item.gsm;
  const minReels =
    req.body.minReels != null ? parseInt(req.body.minReels, 10) : item.minReels;

  if (!size || !gsm) {
    return res.status(400).json({ message: 'size and gsm are required' });
  }
  if (!Number.isFinite(minReels) || minReels < 0) {
    return res.status(400).json({ message: 'minReels must be a non-negative number' });
  }

  item.size = size;
  item.gsm = gsm;
  item.minReels = minReels;

  try {
    await item.save();
    return res.json(item.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: 'Minimum stock already exists for this Size + GSM' });
    }
    throw err;
  }
});

app.delete('/api/stock-minimums/:id', authenticate, authorizeAdmin, async (req, res) => {
  const deleted = await StockMinimum.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Minimum stock rule not found' });
  }
  return res.status(204).send();
});

app.get('/api/reels', authenticate, async (req, res) => {
  const reels = await Reel.find().sort({ date: -1, createdAt: -1 }).lean();
  res.json(reels.map(leanReelToJson));
});

app.post('/api/reels/bulk', authenticate, async (req, res) => {
  const { reels: items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'reels array is required' });
  }
  if (items.length > 500) {
    return res.status(400).json({ message: 'Maximum 500 rows per import' });
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < items.length; i++) {
    const payload = items[i] || {};
    const srNo = String(payload.srNo || '').trim();
    const reelNo = String(payload.reelNo || '').trim();
    if (!srNo || !reelNo) {
      errors.push({ row: i + 1, message: 'SR No and Reel No are required' });
      continue;
    }
    try {
      const isCheckedOut = Boolean(payload.isCheckedOut);
      const reel = await Reel.create({
        date: payload.date || '',
        srNo,
        reelNo,
        shade: payload.shade || '',
        bf: payload.bf || '',
        gsm: payload.gsm || '',
        size: payload.size || '',
        weight: payload.weight != null ? String(payload.weight) : '',
        isCheckedOut,
        outDate: isCheckedOut ? String(payload.outDate || '').trim() : ''
      });
      created.push(reel.toJSON());
    } catch (err) {
      errors.push({ row: i + 1, message: err.message || 'Failed to create reel' });
    }
  }

  return res.status(201).json({
    created,
    errors,
    imported: created.length,
    failed: errors.length
  });
});

app.post('/api/reels', authenticate, async (req, res) => {
  const payload = req.body;
  const reel = await Reel.create({
    date: payload.date || '',
    srNo: payload.srNo || '',
    reelNo: payload.reelNo || '',
    shade: payload.shade || '',
    bf: payload.bf || '',
    gsm: payload.gsm || '',
    size: payload.size || '',
    weight: payload.weight || '',
    isCheckedOut: false,
    outDate: ''
  });
  res.status(201).json(reel.toJSON());
});

app.put('/api/reels/:id', authenticate, async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ message: 'Reel not found' });
  }

  Object.assign(reel, {
    date: req.body.date ?? reel.date,
    srNo: req.body.srNo ?? reel.srNo,
    reelNo: req.body.reelNo ?? reel.reelNo,
    shade: req.body.shade ?? reel.shade,
    bf: req.body.bf ?? reel.bf,
    gsm: req.body.gsm ?? reel.gsm,
    size: req.body.size ?? reel.size,
    weight: req.body.weight ?? reel.weight
  });

  await reel.save();
  return res.json(reel.toJSON());
});

app.patch('/api/reels/:id/toggle', authenticate, async (req, res) => {
  const reel = await Reel.findById(req.params.id);
  if (!reel) {
    return res.status(404).json({ message: 'Reel not found' });
  }

  reel.isCheckedOut = !reel.isCheckedOut;
  reel.outDate = reel.isCheckedOut
    ? new Date()
        .toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
        .replace(',', '')
    : '';

  await reel.save();
  return res.json(reel.toJSON());
});

app.delete('/api/reels/:id', authenticate, async (req, res) => {
  const deleted = await Reel.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Reel not found' });
  }
  return res.status(204).send();
});

/** Production: serve CRA build from same origin so the UI calls `/api` (see reelsApi.js). */
const BUILD_DIR = path.join(__dirname, '..', 'build');
const BUILD_INDEX = path.join(BUILD_DIR, 'index.html');
if (fs.existsSync(BUILD_INDEX)) {
  app.use(express.static(BUILD_DIR));
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'Not found' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(404).send('Not found');
    }
    res.sendFile(BUILD_INDEX);
  });
}

const start = async () => {
  const jwtFromEnv = getJwtSecret();

  console.log(
    '[boot]',
    JSON.stringify({
      node: process.version,
      cwd: process.cwd(),
      NODE_ENV: process.env.NODE_ENV || '',
      PORT,
      hasMongoUri: Boolean(MONGO_URI),
      mongoUriLength: MONGO_URI ? MONGO_URI.length : 0,
      hasJwtSecret: Boolean(jwtFromEnv),
      jwtSecretLength: jwtFromEnv.length,
      productionJwtReady: isProductionJwtReady()
    })
  );

  if (!MONGO_URI) {
    console.error(
      'MONGO_URI is not set. /api/health will still respond; set MONGO_URI on Render to enable the database.'
    );
  }
  if (process.env.NODE_ENV === 'production' && !isProductionJwtReady()) {
    console.error(
      'JWT_SECRET is missing or uses the dev placeholder in production. Authenticated routes will return 503 until you set JWT_SECRET on Render.'
    );
  } else if (
    process.env.NODE_ENV !== 'production' &&
    (!jwtFromEnv || jwtFromEnv === 'dev-secret-change-me')
  ) {
    console.warn(
      'Warning: JWT_SECRET is missing or using the dev default. Set a strong JWT_SECRET for production (Render Environment).'
    );
  }

  const listenHost = process.env.LISTEN_HOST || '0.0.0.0';
  // Bind HTTP first so Render always sees an open port; env/DB issues are surfaced via /api/health instead of 502.
  await new Promise((resolve, reject) => {
    const server = app.listen(PORT, listenHost, () => {
      console.log(`Server listening on ${listenHost}:${PORT}`);
      if (fs.existsSync(BUILD_INDEX)) {
        console.log('Serving React app from / (production build)');
      } else {
        console.log('No ../build/index.html — run npm run build for production UI on this port');
      }
      resolve();
    });
    server.on('error', (err) => {
      reject(new Error(`Failed to listen on ${listenHost}:${PORT}: ${err.message}`));
    });
  });

  if (!MONGO_URI) {
    return;
  }

  void (async () => {
    for (;;) {
      try {
        await mongoose.connect(MONGO_URI, MONGOOSE_CONNECT_OPTS);
        try {
          await seedInitialData();
          console.log('MongoDB connected and seed step finished.');
        } catch (seedErr) {
          console.error('Seed failed (Mongo is connected):', seedErr.message);
        }
        return;
      } catch (err) {
        await mongoose.disconnect().catch(() => {});
        console.error(
          'MongoDB connection failed, retrying in 5s:',
          err.message,
          '(check MONGO_URI and Atlas Network Access)'
        );
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })().catch((e) => {
    console.error('[fatal] Mongo background loop:', e);
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'Check Render → Environment: MONGO_URI, JWT_SECRET (exact key names). Atlas Network Access must allow Render. GET /api/health shows database status once the process is up.'
    );
  }
  process.exit(1);
});
