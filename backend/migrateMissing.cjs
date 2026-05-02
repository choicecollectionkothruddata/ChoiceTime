const cloudinary = require('cloudinary').v2;
const ImageKit = require('imagekit');
const mongoose = require('mongoose');
require('dotenv').config();

cloudinary.config({
  cloud_name: 'dndqnoxqg',
  api_key: 'YOUR_DNDQNOXQG_API_KEY',
  api_secret: 'YOUR_DNDQNOXQG_API_SECRET'
});

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  const docs = await products.find({
    images: /image\/upload/
  }).toArray();

  console.log('Products with missing images:', docs.length);

  for (const doc of docs) {
    const newImages = [];
    for (const img of (doc.images || [])) {
      if (!img || !img.includes('image/upload')) {
        newImages.push(img);
        continue;
      }
      const match = img.match(/image\/upload\/([a-z0-9]+)\.jpg/);
      if (!match) { newImages.push(img); continue; }
      const publicId = match[1];

      try {
        const cloudUrl = `https://res.cloudinary.com/dndqnoxqg/image/upload/${publicId}.jpg`;
        const result = await imagekit.upload({
          file: cloudUrl,
          fileName: publicId + '.jpg',
          folder: '/cloudinary-migration/',
        });
        console.log('✅ Migrated:', publicId);
        newImages.push(result.url);
      } catch (err) {
        console.log('❌ Failed:', publicId, err.message);
        newImages.push(img);
      }
    }
    await products.updateOne(
      { _id: doc._id },
      { $set: { images: newImages } }
    );
  }

  console.log('🎉 Done!');
  process.exit(0);
});
