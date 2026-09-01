const http = require('http');

const data = JSON.stringify({
  email: 'test@example.com',
  password: 'password123',
  username: 'test_user',
  nama_lengkap: 'Test User',
  sekolah: 'Test School',
  mata_pelajaran: 'Math',
  kelas: '10',
  status: 'aktif'
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/admin/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test'
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
