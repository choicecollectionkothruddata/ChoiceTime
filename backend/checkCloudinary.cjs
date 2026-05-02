const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');
  
  const docs = await products.find({
    $or: [
      { thumbnail: /cloudinary/ },
      { 'images': /cloudinary/ }
    ]
  }).limit(10).toArray();

  docs.forEach(doc => {
    if (doc.thumbnail && doc.thumbnail.includes('cloudinary')) {
      console.log('thumbnail:', doc.thumbnail);
    }
    if (doc.images) {
      doc.images.forEach(img => {
        if (img && img.includes('cloudinary')) {
          console.log('image:', img);
        }
      });
    }
  });

  process.exit(0);
});
