const cloudinary = require('cloudinary').v2;
const ImageKit = require('imagekit');
const mongoose = require('mongoose');
require('dotenv').config();

cloudinary.config({
  cloud_name: 'dbaihu0aw',
  api_key: 'YOUR_DBAIHU0AW_API_KEY',
  api_secret: 'YOUR_DBAIHU0AW_API_SECRET'
});

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  // Find products with broken ImageKit URLs (no suffix = not properly migrated)
  const docs = await products.find({
    images: /ik\.imagekit\.io/
  }).toArray();

  console.log('Total products with ImageKit URLs:', docs.length);

  for (const doc of docs) {
    const newImages = [];
    let changed = false;

    for (const img of (doc.images || [])) {
      if (!img) { newImages.push(img); continue; }

      // Extract original Cloudinary public_id from the URL
      const match = img.match(/cloudinary-migration\/([a-z0-9]+)/);
      if (!match) { newImages.push(img); continue; }

      const publicId = match[1];

      // Try to upload from Cloudinary to ImageKit with correct name
      try {
        const cloudinaryUrl = `https://res.cloudinary.com/dbaihu0aw/image/upload/${publicId}.jpg`;
        const result = await imagekit.upload({
          file: cloudinaryUrl,
          fileName: publicId + '.jpg',
          folder: '/cloudinary-migration/',
          overwriteFile: true,
        });
        newImages.push(result.url);
        console.log('✅ Re-uploaded:', publicId);
        changed = true;
      } catch (err) {
        console.log('❌ Failed:', publicId, err.message);
        newImages.push(img);
      }
    }

    if (changed) {
      await products.updateOne(
        { _id: doc._id },
        { $set: { images: newImages } }
      );
    }
  }

  console.log('🎉 Done!');
  process.exit(0);
});
