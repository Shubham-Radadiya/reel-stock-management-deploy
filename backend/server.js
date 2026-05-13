const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' }
  },
  { timestamps: true }
);

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

userSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
const Reel = mongoose.model('Reel', reelSchema);

const createToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
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
    const payload = jwt.verify(token, JWT_SECRET);
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
      role: 'admin'
    });
  } else if (adminUser.role !== 'admin') {
    adminUser.role = 'admin';
    await adminUser.save();
  }

  const defaultUser = await User.findOne({ username: defaultUsername });
  if (!defaultUser) {
    const defaultUserHash = await bcrypt.hash(defaultUserPassword, 10);
    await User.create({
      username: defaultUsername,
      email: defaultUserEmail,
      passwordHash: defaultUserHash,
      role: 'user'
    });
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
  res.json({ ok: true, message: 'API is running' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  return res.json({
    message: 'Login successful',
    token: createToken(user),
    user: user.toJSON()
  });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

app.get('/api/users', authenticate, authorizeAdmin, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map((u) => u.toJSON()));
});

app.post('/api/users', authenticate, authorizeAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: 'username, email, and password are required' });
  }

  const existing = await User.findOne({
    $or: [{ username }, { email }]
  });
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    username,
    email,
    passwordHash,
    role: role === 'admin' ? 'admin' : 'user'
  });

  res.status(201).json(newUser.toJSON());
});

app.get('/api/reels', authenticate, async (req, res) => {
  const reels = await Reel.find().sort({ date: -1, createdAt: -1 });
  res.json(reels.map((r) => r.toJSON()));
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
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is missing. Add it in backend/.env');
  }
  await mongoose.connect(MONGO_URI);
  await seedInitialData();
  const host = process.env.HOST || '0.0.0.0';
  app.listen(PORT, host, () => {
    const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${PORT}`;
    console.log(`Server listening on ${url}`);
    if (fs.existsSync(BUILD_INDEX)) {
      console.log('Serving React app from / (production build)');
    } else {
      console.log('No ../build/index.html — run npm run build for production UI on this port');
    }
  });
};

start().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
