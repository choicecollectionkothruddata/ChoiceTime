const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  let totalCloudinary = 0;
  
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments({
      $or: [
        { thumbnail: /res\.cloudinary\.com/ },
        { images: /res\.cloudinary\.com/ },
        { image: /res\.cloudinary\.com/ },
      ]
    });
    if (count > 0) {
      console.log('Has cloudinary:', col.name, count);
      totalCloudinary += count;
    }
  }
  
  if (totalCloudinary === 0) {
    console.log('✅ 100% CLEAN - Zero cloudinary URLs in database!');
  } else {
    console.log('Total still on cloudinary:', totalCloudinary);
  }
  
  process.exit(0);
});
