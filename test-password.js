import bcrypt from 'bcrypt';

const password = 'Admin123!';
const dbHash = '$2a$10$sM8OIU0Vh.hf8d/dehiGCuJeUmkb0bJdBJWpAoM2t7FzwXqhx5YR6';

async function test() {
  const isValid = await bcrypt.compare(password, dbHash);
  console.log('Password:', password);
  console.log('Hash:', dbHash);
  console.log('Comparison result:', isValid);
}

test().catch(console.error);
