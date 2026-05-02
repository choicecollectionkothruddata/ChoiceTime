"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const cloudinary = require("cloudinary").v2;
const ImageKit = require("imagekit");

const CN = process.env.CLOUDINARY_CLOUD_NAME;
const CK = process.env.CLOUDINARY_API_KEY;
const CS = process.env.CLOUDINARY_API_SECRET;
const IPK = process.env.IMAGEKIT_PUBLIC_KEY;
const ISK = process.env.IMAGEKIT_PRIVATE_KEY;
const IEP = process.env.IMAGEKIT_URL_ENDPOINT;

["CLOUDINARY_CLOUD_NAME","CLOUDINARY_API_KEY","CLOUDINARY_API_SECRET","IMAGEKIT_PUBLIC_KEY","IMAGEKIT_PRIVATE_KEY","IMAGEKIT_URL_ENDPOINT"].forEach(function (k) {
  if (!process.env[k]) throw new Error("Missing env: " + k);
});

cloudinary.config({ cloud_name: CN, api_key: CK, api_secret: CS });

const imagekit = new ImageKit({
  publicKey: IPK,
  privateKey: ISK,
  urlEndpoint: String(IEP).trim(),
});

const IK_FOLDER = "/cloudinary-migration";

function ikUpload(p) {
  return new Promise(function (resolve, reject) {
    imagekit.upload(p, function (err, res) { err ? reject(err) : resolve(res || {}); });
  });
}

async function migrateAll() {
  var nextCursor = null;
  var count = 0;
  console.log("Starting Cloudinary -> ImageKit migration…");

  do {
    var result = await cloudinary.api.resources({
      max_results: 100,
      next_cursor: nextCursor || undefined,
      resource_type: "image",
      type: "upload",
    });
    nextCursor = result.next_cursor || null;
    var resources = result.resources || [];

    for (var i = 0; i < resources.length; i++) {
      var resource = resources[i];
      try {
        var secureUrl = resource.secure_url;
        if (!secureUrl) {
          var fmt = resource.format ? String(resource.format).toLowerCase().replace(/^jpeg$/i, "jpg") : "jpg";
          secureUrl = "https://res.cloudinary.com/" + CN + "/image/upload/v" + resource.version + "/" + resource.public_id + "." + fmt;
        }
        var ext = resource.format ? String(resource.format).toLowerCase().replace(/^jpeg$/i, "jpg") : "jpg";
        var safeName = String(resource.public_id).replace(/\//g, "_") + "." + ext;

        var uploaded = await ikUpload({
          file: secureUrl,
          folder: IK_FOLDER,
          fileName: safeName.slice(-200),
          useUniqueFileName: true,
        });
        var url = uploaded.url || (uploaded.response && uploaded.response.url);
        count++;
        console.log(count, resource.public_id, "->", url);
      } catch (e) {
        console.error("FAIL", resource && resource.public_id, String(e.message || e));
      }
    }
  } while (nextCursor);

  console.log("Done. Total migrated:", count);
}

migrateAll().catch(function (e) {
  console.error(e);
  process.exit(1);
});
