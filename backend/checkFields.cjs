const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const products = db.collection('products');

  const doc = await products.findOne({
    $or: [
      { thumbnail: /cloudinary/ },
      { images: /cloudinary/ },
      { image: /cloudinary/ },
      { url: /cloudinary/ },
    ]
  });

  console.log('Sample doc keys:', Object.keys(doc));
  console.log('\nFull doc:');
  console.log(JSON.stringify(doc, null, 2));
  
  process.exit(0);
});
