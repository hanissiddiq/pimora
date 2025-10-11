const bcrypt = require('bcrypt');

const password = '12345';  // Password yang ingin di-hash
const saltRounds = 10;  // Jumlah iterasi salt

bcrypt.hash(password, saltRounds, function(err, hashedPassword) {
  if (err) throw err;
  console.log("Hashed password:", hashedPassword);  // Cetak hasil hash
});