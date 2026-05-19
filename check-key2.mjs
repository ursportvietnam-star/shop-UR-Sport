const key = 'AIzaSyAf4rZHm53ZUxbmx1lqEStNaa4fU699OgI';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
const payload = {
  contents: [{ role: 'user', parts: [{ text: 'Xin chào' }] }]
};
fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  .then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2)));
