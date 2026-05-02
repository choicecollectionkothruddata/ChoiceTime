const mongoose = require('mongoose');
require('dotenv').config();

const OLD_URL = 'res.cloudinary.com/dbaihu0aw';
const NEW_URL = 'ik.imagekit.io/eu78h8v4i/cloudinary-migration';

async function updateUrls() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const col of collections) {
    const collection = db.collection(col.name);

    // Update thumbnail field
    const r1 = await collection.updateMany(
      { thumbnail: { $regex: 'cloudinary.com' } },
      [{ $set: { thumbnail: { $replaceAll: { input: '$thumbnail', find: OLD_URL, replacement: NEW_URL } } } }]
    );

    // Update images array
    const r2 = await collection.updateMany(
      { images: { $elemMatch: { $regex: 'cloudinary.com' } } },
      [{ $set: { images: { $map: { input: '$images', as: 'img', in: { $replaceAll: { input: '$$img', find: OLD_URL, replacement: NEW_URL } } } } } }]
    );

    // Update single image field
    const r3 = await collection.updateMany(
      { image: { $regex: 'cloudinary.com' } },
      [{ $set: { image: { $replaceAll: { input: '$image', find: OLD_URL, replacement: NEW_URL } } } }]
    );

    const total = r1.modifiedCount + r2.modifiedCount + r3.modifiedCount;
    if (total > 0) {
      console.log(`✅ ${col.name}: updated ${total} documents`);
    }
  }

  console.log('\n🎉 All URLs updated!');
  process.exit(0);
}

updateUrls().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
