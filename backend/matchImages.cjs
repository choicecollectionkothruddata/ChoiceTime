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

  // Get ALL files from ImageKit cloudinary-migration folder
  console.log('Fetching all files from ImageKit...');
  let allFiles = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const files = await imagekit.listFiles({
      path: '/cloudinary-migration',
      limit,
      skip,
    });
    if (!files || files.length === 0) break;
    allFiles = allFiles.concat(files);
    skip += limit;
    if (files.length < limit) break;
  }

  console.log('Total files in ImageKit:', allFiles.length);

  // Build a map: publicId -> full URL
  const urlMap = {};
  for (const file of allFiles) {
    // Extract base publicId (before the underscore+suffix)
    const baseName = file.name.replace(/\.[^.]+$/, ''); // remove extension
    const baseId = baseName.replace(/_[a-zA-Z0-9\-_]{6,}$/, ''); // remove suffix
    urlMap[baseId] = file.url;
  }

  console.log('Built URL map with', Object.keys(urlMap).length, 'entries');

  // Update all products
  const docs = await products.find({
    images: /ik\.imagekit\.io/
  }).toArray();

  let fixed = 0;
  for (const doc of docs) {
    const newImages = doc.images.map(img => {
      if (!img) return img;
      const match = img.match(/cloudinary-migration\/([a-z0-9]+)/);
      if (!match) return img;
      const publicId = match[1];
      if (urlMap[publicId]) {
        return urlMap[publicId];
      }
      return img;
    });

    await products.updateOne(
      { _id: doc._id },
      { $set: { images: newImages } }
    );
    fixed++;
  }

  console.log('✅ Fixed', fixed, 'products!');
  process.exit(0);
});
