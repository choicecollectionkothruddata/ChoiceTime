const ImageKit = require('imagekit');
require('dotenv').config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const hardcodedImages = [
  // Navbar
  { url: 'https://res.cloudinary.com/dl6hpq7mm/image/upload/f_auto,q_auto,w_200/v1770185345/image-removebg-preview_2_we5d7r.png', name: 'navbar-logo' },
  // ShopByCategory
  { url: 'https://res.cloudinary.com/daxdjob49/image/upload/v1770667481/b4976978-8ee9-4b94-8c4d-eb1a0b48e650.png', name: 'category-1' },
  { url: 'https://res.cloudinary.com/daxdjob49/image/upload/v1770666728/19fe40b9-8c6c-4fbe-aed4-9341c931600e.png', name: 'category-2' },
  { url: 'https://res.cloudinary.com/daxdjob49/image/upload/v1774959710/4b3584ae-244b-4122-bb83-538c93803260.png', name: 'category-3' },
  { url: 'https://res.cloudinary.com/daxdjob49/image/upload/v1770666752/b025a01b-ace8-4a69-aba5-6f3390372142.png', name: 'category-4' },
  { url: 'https://res.cloudinary.com/daxdjob49/image/upload/v1775115656/634a46ad-525a-4be4-998a-2439ae7a9024.png', name: 'category-5' },
  { url: 'https://res.cloudinary.com/daxdjob49/image/upload/v1775115876/4f1e726f-c8f1-45a3-a82e-2e34890da1f1.png', name: 'category-6' },
  // HeroCarousel
  { url: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1774793598/green_and_yellow_modern_watch_banner_1920_x_600_px_ivfzej.png', name: 'hero-banner-1' },
  { url: 'https://res.cloudinary.com/dzd47mpdo/image/upload/v1774794124/green_and_yellow_modern_watch_retractable_banner_600_x_600_px_bowqhd.png', name: 'hero-banner-2' },
];

async function migrate() {
  console.log('🚀 Uploading hardcoded images to ImageKit...\n');

  for (const img of hardcodedImages) {
    try {
      const result = await imagekit.upload({
        file: img.url,
        fileName: img.name + '.png',
        folder: '/static/',
      });
      console.log(`✅ ${img.name}`);
      console.log(`   NEW URL: ${result.url}\n`);
    } catch (err) {
      console.log(`❌ Failed: ${img.name}`, err.message);
    }
  }

  console.log('🎉 Done! Copy the NEW URLs above and replace in your JSX files.');
}

migrate();
