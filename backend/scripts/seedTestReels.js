/**
 * Inserts 500 test reels with varied entry dates and realistic out dates.
 * Idempotent: deletes any existing reels whose reelNo starts with "SEED-" then inserts fresh rows.
 *
 * Usage: npm run seed:reels
 * Requires: MongoDB running, MONGO_URI in backend/.env
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const COUNT = 500;

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

const Reel = mongoose.models.Reel || mongoose.model('Reel', reelSchema);

const pad2 = (n) => String(n).padStart(2, '0');

const formatYmd = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Match app / backend toggle format: dd/MM/yy HH:mm */
const formatOutDate = (d) => {
  const yy = String(d.getFullYear()).slice(-2);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${yy} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const deleted = await Reel.deleteMany({ reelNo: /^SEED-/ });
  if (deleted.deletedCount) {
    console.log(`Removed ${deleted.deletedCount} previous SEED-* reels.`);
  }

  const shades = ['N', 'G'];
  const BF = '16';
  const gsms = ['100', '115', '120', '130', '140', '180'];
  /** Sizes 20–62 inclusive (whole numbers). */
  const randomSize = () => String(randomInt(20, 62));

  const rangeStart = new Date(2023, 0, 1);
  const rangeEnd = new Date();
  rangeEnd.setHours(23, 59, 59, 999);

  const docs = [];
  for (let i = 0; i < COUNT; i++) {
    const t =
      rangeStart.getTime() +
      Math.random() * (rangeEnd.getTime() - rangeStart.getTime());
    const entryDate = new Date(t);
    entryDate.setHours(0, 0, 0, 0);
    const dateStr = formatYmd(entryDate);

    const checkedOut = Math.random() < 0.58;
    let outDate = '';
    if (checkedOut) {
      const outT =
        entryDate.getTime() +
        Math.random() * (Date.now() - entryDate.getTime());
      const outD = new Date(outT);
      outD.setHours(randomInt(7, 19), randomInt(0, 59), 0, 0);
      outDate = formatOutDate(outD);
    }

    docs.push({
      date: dateStr,
      srNo: String(50000 + i),
      reelNo: `SEED-${String(i + 1).padStart(5, '0')}`,
      shade: pick(shades),
      bf: BF,
      gsm: pick(gsms),
      size: randomSize(),
      weight: String(randomInt(260, 520)),
      isCheckedOut: checkedOut,
      outDate: checkedOut ? outDate : ''
    });
  }

  await Reel.insertMany(docs);
  console.log(`Inserted ${docs.length} test reels (reelNo SEED-00001 … SEED-${String(COUNT).padStart(5, '0')}).`);
  console.log('BF=16; GSM in 100,115,120,130,140,180; size 20–62; varied dates.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
