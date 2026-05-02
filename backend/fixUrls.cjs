const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  const docs = await products.find({
    images: /cloudinary-migration\/image\/upload/
  }).toArray();

  console.log('Found docs to fix:', docs.length);

  for (const doc of docs) {
    const newImages = doc.images.map(img => {
      if (img && img.includes('cloudinary-migration/image/upload')) {
        // Remove /image/upload/v1234567890/ part
        return img.replace(/\/image\/upload\/v\d+\//, '/');
      }
      return img;
    });

    await products.updateOne(
      { _id: doc._id },
      { $set: { images: newImages } }
    );
  }

  console.log('✅ Fixed', docs.length, 'documents!');
  process.exit(0);
});
