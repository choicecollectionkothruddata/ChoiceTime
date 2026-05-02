const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  const docs = await products.find({
    $or: [
      { thumbnail: /cloudinary/ },
      { images: /cloudinary/ }
    ]
  }).toArray();

  const accounts = {};

  for (const doc of docs) {
    const allUrls = [
      doc.thumbnail,
      ...(doc.images || [])
    ].filter(Boolean);

    for (const url of allUrls) {
      if (url.includes('cloudinary')) {
        const match = url.match(/res\.cloudinary\.com\/([^/]+)/);
        if (match) {
          const account = match[1];
          accounts[account] = (accounts[account] || 0) + 1;
        }
      }
    }
  }

  console.log('Cloudinary accounts still in DB:');
  console.log(accounts);
  process.exit(0);
});
