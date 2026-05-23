async function checkUrl(url) {
  try {
    const res = await fetch(url);
    const contentType = res.headers.get('content-type') || '';
    const contentLength = res.headers.get('content-length') || '';
    console.log(`${url} => Status: ${res.status}, Type: ${contentType}, Length: ${contentLength}`);
  } catch (err) {
    console.error(`Error fetching ${url}:`, err.message);
  }
}

async function main() {
  const urls = [
    'https://shop-ur-sport.vercel.app/images/blog/ao-thun-nam-ascend-lifestyle-ngoi-ghe.webp',
    'https://shop-ur-sport.vercel.app/images/blog/ao-thun-nam-ascend-den-front-back-premium.webp',
    'https://shop-ur-sport.vercel.app/images/blog/ao-thun-nam-ascend-xanh-den-front-back-premium.webp',
    'https://shop-ur-sport.vercel.app/images/blog/ao-thun-nam-ascend-nguoi-mau-dung-front-xanh-den.webp',
    'https://shop-ur-sport.vercel.app/images/products/ao-thun-nam-ascend-lifestyle-ngoi-ghe.webp',
    'https://shop-ur-sport.vercel.app/images/products/ao-thun-nam-ascend-xanh-den-front-back.webp',
    'https://shop-ur-sport.vercel.app/images/products/ao-thun-nam-ascend-trang-front-back.webp'
  ];
  
  for (const url of urls) {
    await checkUrl(url);
  }
}

main().catch(console.error);
