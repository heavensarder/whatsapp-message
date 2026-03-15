require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setup() {
  let conn;
  try {
    // Connect without database first to create it
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL');

    // Read and execute schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await conn.query(schema);
    
    console.log('✅ Database and tables created successfully!');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ DB setup failed:', err.message);
    if (conn) await conn.end().catch(() => {});
    process.exit(1);
  }
}

setup();
