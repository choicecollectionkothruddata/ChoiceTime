const mongoose = require('mongoose');
const ImageKit = require('imagekit');
require('dotenv').config();

const ik = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function getAllFiles() {
  let files = [];
  let skip = 0;
  while (true) {
    const batch = await ik.listFiles({ limit: 100, skip, path: '/cloudinary-migration' });
    if (!batch.length) break;
    files = files.concat(batch);
    skip += 100;
    console.log('Fetched', files.length, 'files from ImageKit...');
    if (batch.length < 100) break;
  }
  return files;
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  const files = await getAllFiles();
  console.log('Total files in ImageKit:', files.length);

  // Build a map: originalPublicId -> imagekit clean URL
  // ImageKit filename is like: oxtqwb4sm3z1hqca2crz_-YmEe-6YO.jpg
  // Original cloudinary public ID is: oxtqwb4sm3z1hqca2crz
  const map = {};
  for (const f of files) {
    // Strip the _XXXXX suffix added by ImageKit and the extension
    const nameWithoutExt = f.name.replace(/\.[^.]+$/, ''); // remove .jpg
    const originalId = nameWithoutExt.replace(/_[^_]+$/, ''); // remove _suffix
    const cleanUrl = f.url.split('?')[0]; // remove ?updatedAt=...
    map[originalId] = cleanUrl;
  }

  console.log('Built map with', Object.keys(map).length, 'entries');

  const db = mongoose.connection.db;
  const products = db.collection('products');
  const docs = await products.find({}).toArray();

  let updated = 0;
  for (const doc of docs) {
    const fixUrl = (url) => {
      if (!url) return url;
      // Extract the public ID from current URL
      // current: https://ik.imagekit.io/eu78h8v4i/cloudinary-migration/oxtqwb4sm3z1hqca2crz.jpg
      const match = url.match(/cloudinary-migration\/([^./?]+)/);
      if (!match) return url;
      const publicId = match[1];
      return map[publicId] || url;
    };

    const newThumbnail = fixUrl(doc.thumbnail);
    const newImages = (doc.images || []).map(fixUrl);

    if (newThumbnail !== doc.thumbnail || JSON.stringify(newImages) !== JSON.stringify(doc.images)) {
      await products.updateOne(
        { _id: doc._id },
        { $set: { thumbnail: newThumbnail, images: newImages } }
      );
      updated++;
    }
  }

  console.log('Updated', updated, 'products');

  // Verify
  const sample = await products.findOne({});
  console.log('Sample URL:', sample.images && sample.images[0]);

  process.exit(0);
});
