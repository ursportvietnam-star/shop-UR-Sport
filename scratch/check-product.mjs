async function main() {
  const projectId = 'shop-ursport';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products`;
  
  console.log('Fetching products from Firestore...');
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Failed to fetch:', res.statusText);
    return;
  }
  
  const data = await res.json();
  const docs = data.documents || [];
  
  for (const doc of docs) {
    const fields = doc.fields;
    const name = fields.name?.stringValue;
    const slug = fields.slug?.stringValue;
    
    if (slug === 'ao-thun-nam-ascend-premium-cotton') {
      console.log('--- FOUND PRODUCT ---');
      console.log('Name:', name);
      const desc = fields.description?.stringValue || '';
      console.log('Scanning images in description...');
      
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
      let match;
      let count = 0;
      while ((match = imgRegex.exec(desc)) !== null) {
        count++;
        console.log(`Image ${count}: ${match[1]}`);
      }
    }
  }
}

main().catch(console.error);
