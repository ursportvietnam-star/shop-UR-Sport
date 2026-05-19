const key = 'AIzaSyAf4rZHm53ZUxbmx1lqEStNaa4fU699OgI';
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`;
const payload = {
  contents: [{ role: 'user', parts: [{ text: 'Xin chào' }] }],
  generationConfig: {
    response_mime_type: "application/json"
  }
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(async res => {
  const data = await res.json();
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', JSON.stringify(data, null, 2));
})
.catch(err => console.error('ERROR:', err));
