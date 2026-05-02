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

  // Find all products with daxdjob49 URLs
  const docs = await products.find({
    $or: [
      { thumbnail: /daxdjob49/ },
      { images: /daxdjob49/ }
    ]
  }).toArray();

  console.log('Found products with daxdjob49 URLs:', docs.length);

  for (const doc of docs) {
    let updated = false;

    // Fix thumbnail
    if (doc.thumbnail && doc.thumbnail.includes('daxdjob49')) {
      try {
        const result = await imagekit.upload({
          file: doc.thumbnail,
          fileName: doc._id + '_thumb.jpg',
          folder: '/cloudinary-migration/',
        });
        await products.updateOne(
          { _id: doc._id },
          { $set: { thumbnail: result.url } }
        );
        console.log('✅ Fixed thumbnail for:', doc.name || doc._id);
        updated = true;
      } catch (err) {
        console.log('❌ Failed thumbnail:', doc._id, err.message);
      }
    }

    // Fix images array
    if (doc.images && doc.images.length > 0) {
      const newImages = [];
      for (const img of doc.images) {
        if (img && img.includes('daxdjob49')) {
          try {
            const result = await imagekit.upload({
              file: img,
              fileName: doc._id + '_' + newImages.length + '.jpg',
              folder: '/cloudinary-migration/',
            });
            newImages.push(result.url);
            console.log('✅ Fixed image for:', doc.name || doc._id);
          } catch (err) {
            console.log('❌ Failed image:', err.message);
            newImages.push(img); // keep original if failed
          }
        } else {
          newImages.push(img);
        }
      }
      await products.updateOne(
        { _id: doc._id },
        { $set: { images: newImages } }
      );
    }
  }

  console.log('\n🎉 Done!');
  process.exit(0);
});
