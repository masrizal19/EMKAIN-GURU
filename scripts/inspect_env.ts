console.log('=== ENVIRONMENT VARIABLE KEYS ===');
Object.keys(process.env).sort().forEach(key => {
  const isSecret = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('pass');
  console.log(`${key}: ${isSecret ? '[HIDDEN_SECRET]' : process.env[key]}`);
});
