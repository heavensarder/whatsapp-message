require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');

async function seed() {
  const { query } = require('./db');
  
  try {
    // Create admin user
    const password = 'Mediasoft2026@#';
    const hash = await bcrypt.hash(password, 12);
    
    await query(`
      INSERT INTO admin_users (email, password_hash, name)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE password_hash = ?, name = ?
    `, ['admin@mediasoftbd.com', hash, 'Admin', hash, 'Admin']);
    
    // Create default session record
    await query(`
      INSERT INTO wa_sessions (session_key, status)
      VALUES ('default', 'disconnected')
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `);
    
    console.log('✅ Database seeded successfully!');
    console.log('   Admin: admin@mediasoftbd.com / Mediasoft2026@#');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
