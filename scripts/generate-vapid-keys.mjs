#!/usr/bin/env node
/** Generate VAPID keys for admin web push. */
const webpush = require("web-push");
const keys = webpush.generateVAPIDKeys();
console.log("Add these to .env.local / Vercel:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:Nailtekandspa52018@yahoo.com");
