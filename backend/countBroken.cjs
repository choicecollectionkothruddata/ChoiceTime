const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const count = await db.collection('products').countDocuments({
    $or: [
      { thumbnail: /daxdjob49/ },
      { images: /daxdjob49/ }
    ]
  });
  console.log('Products with broken images:', count);
  process.exit(0);
});
