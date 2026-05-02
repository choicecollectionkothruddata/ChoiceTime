const ImageKit = require('imagekit');
const mongoose = require('mongoose');
require('dotenv').config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function tryUpload(publicId) {
  const accounts = ['dndqnoxqg', 'dbaihu0aw'];
  for (const account of accounts) {
    try {
      const url = `https://res.cloudinary.com/${account}/image/upload/${publicId}.jpg`;
      const result = await imagekit.upload({
        file: url,
        fileName: publicId + '.jpg',
        folder: '/cloudinary-migration/',
      });
      console.log('✅ Migrated from ' + account + ': ' + publicId);
      return result.url;
    } catch (err) {
      // try next account
    }
  }
  console.log('❌ Not found: ' + publicId);
  return null;
}

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');
  const docs = await products.find({ images: /image\/upload/ }).toArray();
  console.log('Products still broken: ' + docs.length);
  for (const doc of docs) {
    const newImages = [];
    for (const img of (doc.images || [])) {
      if (!img || !img.includes('image/upload')) {
        newImages.push(img);
        continue;
      }
      const match = img.match(/image\/upload\/([a-z0-9]+)\.jpg/);
      if (!match) {
        newImages.push(img);
        continue;
      }
      const newUrl = await tryUpload(match[1]);
      newImages.push(newUrl || img);
    }
    await products.updateOne({ _id: doc._id }, { $set: { images: newImages } });
  }
  console.log('Done!');
  process.exit(0);
});
