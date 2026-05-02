const ImageKit = require('imagekit');
const mongoose = require('mongoose');
require('dotenv').config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  // Get ALL files from ImageKit
  console.log('Fetching files from ImageKit...');
  let allFiles = [];
  let skip = 0;

  while (true) {
    const files = await imagekit.listFiles({
      path: '/cloudinary-migration',
      limit: 100,
      skip,
    });
    if (!files || files.length === 0) break;
    allFiles = allFiles.concat(files);
    skip += 100;
    if (files.length < 100) break;
  }

  console.log('Total ImageKit files:', allFiles.length);

  // Build map: baseId -> url
  const urlMap = {};
  for (const file of allFiles) {
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const baseId = baseName.replace(/_[a-zA-Z0-9\-_]{6,}$/, '');
    urlMap[baseId] = file.url;
  }

  // Find ALL products with /image/upload/ pattern
  const docs = await products.find({
    images: /image\/upload/
  }).toArray();

  console.log('Products with wrong URLs:', docs.length);

  let fixed = 0;
  for (const doc of docs) {
    const newImages = doc.images.map(img => {
      if (!img || !img.includes('image/upload')) return img;
      // Extract publicId from /image/upload/PUBLICID.jpg
      const match = img.match(/image\/upload\/([a-z0-9]+)\.jpg/);
      if (!match) return img;
      const publicId = match[1];
      if (urlMap[publicId]) {
        console.log('✅ Fixed:', publicId, '->', urlMap[publicId]);
        fixed++;
        return urlMap[publicId];
      }
      console.log('❌ Not found in ImageKit:', publicId);
      return img;
    });

    await products.updateOne(
      { _id: doc._id },
      { $set: { images: newImages } }
    );
  }

  console.log('\n🎉 Total fixed:', fixed);
  process.exit(0);
});
