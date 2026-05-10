const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDeepSeek() {
  const apiKey = 'sk-f24bb51d84ee4fda8f9221e07842ef33';
  const url = 'https://api.deepseek.com/v1/chat/completions';

  console.log('Testing DeepSeek API Key...');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Chào bạn, hãy viết 1 câu ngắn gọn giới thiệu về shop đồ thể thao UR Sport.' }
        ],
        max_tokens: 50
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('Response:', data.choices[0].message.content);
    } else {
      console.log('❌ Failed!');
      console.log('Error Data:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

testDeepSeek();
