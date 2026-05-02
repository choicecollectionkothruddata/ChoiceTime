const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  const docs = await products.find({
    images: /ik\.imagekit\.io.*cloudinary-migration/
  }).toArray();

  console.log('Found:', docs.length);

  for (const doc of docs) {
    const newImages = doc.images.map(img => {
      if (!img || !img.includes('cloudinary-migration')) return img;
      // Extract just the public_id
      const match = img.match(/cloudinary-migration\/([a-z0-9]+)\.jpg/);
      if (!match) return img;
      const publicId = match[1];
      // Use Web Folder URL - ImageKit fetches from Cloudinary on demand
      return `https://ik.imagekit.io/eu78h8v4i/image/upload/${publicId}.jpg`;
    });

    await products.updateOne(
      { _id: doc._id },
      { $set: { images: newImages } }
    );
  }

  console.log('✅ Done!');
  process.exit(0);
});
