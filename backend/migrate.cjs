const cloudinary = require('cloudinary').v2;
const ImageKit = require('imagekit');

cloudinary.config({
  cloud_name: 'dndqnoxqg',
  api_key: '757472666593523',
  api_secret: 'DBrABCY-uwW1kCGA2AQwg4h6ljw'
});

const imagekit = new ImageKit({
  publicKey: 'public_4rt8LJR/NHUXBaYyS4RP3FRmN7M=',
  privateKey: 'private_ZtxE3pa8cFSf+bVnWW10sDPDmsY=',
  urlEndpoint: 'https://ik.imagekit.io/eu78h8v4i'
});

async function migrateAll() {
  let nextCursor = null;
  let count = 0;

  console.log('🚀 Starting migration...');

  do {
    const result = await cloudinary.api.resources({
      max_results: 100,
      next_cursor: nextCursor,
      resource_type: 'image'
    });

    for (const resource of result.resources) {
      try {
        await imagekit.upload({
          file: resource.secure_url,
          fileName: resource.public_id.replace(/\//g, '_') + '.jpg',
          folder: '/cloudinary-migration/'
        });
        count++;
        console.log(`✅ ${count} Migrated: ${resource.public_id}`);
      } catch (err) {
        console.log(`❌ Failed: ${resource.public_id}`, err.message);
      }
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  console.log(`\n🎉 Done! Total migrated: ${count} images`);
}

migrateAll();
