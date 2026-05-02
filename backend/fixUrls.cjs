const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  const docs = await products.find({
    $or: [
      { thumbnail: /ik\.imagekit\.io.*\/image\/upload\// },
      { images: /ik\.imagekit\.io.*\/image\/upload\// }
    ]
  }).toArray();

  console.log('Found docs to fix:', docs.length);

  for (const doc of docs) {
    const fixUrl = (url) => {
      if (!url) return url;
      return url.replace(/\/image\/upload\/v\d+\//, '/');
    };

    const newThumbnail = fixUrl(doc.thumbnail);
    const newImages = (doc.images || []).map(fixUrl);

    await products.updateOne(
      { _id: doc._id },
      { $set: { thumbnail: newThumbnail, images: newImages } }
    );
  }

  console.log('Fixed', docs.length, 'documents');
  process.exit(0);
});

