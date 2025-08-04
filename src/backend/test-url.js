const url = 'https://api.openai.com/v1/chat/completions';
const testUrl = new URL(url);
const basePath = testUrl.pathname.replace(/\/v1\/.*$/, '').replace(/\/$/, '');
testUrl.pathname = basePath + '/v1/models';
console.log('Original:', url);
console.log('Models endpoint:', testUrl.toString());

// Test with different URLs
const urls = [
  'https://api.openai.com/v1/chat/completions',
  'https://api.example.com/v1/completions',
  'https://api.example.com/v1/models',
  'https://api.example.com/'
];

urls.forEach(originalUrl => {
  const testUrl = new URL(originalUrl);
  const basePath = testUrl.pathname.replace(/\/v1\/.*$/, '').replace(/\/$/, '');
  testUrl.pathname = basePath + '/v1/models';
  console.log(`${originalUrl} -> ${testUrl.toString()}`);
});
