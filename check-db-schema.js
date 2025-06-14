const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Read the DATABASE_URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}
console.log(`Using DATABASE_URL: ${DATABASE_URL.substring(0, 20)}...`);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTables() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    // Get list of all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tables in database:');
    tablesResult.rows.forEach(row => {
      console.log(` - ${row.table_name}`);
    });
    
    // Check if finishes table exists and get its columns
    if (tablesResult.rows.some(row => row.table_name === 'finishes')) {
      const finishesColumnsResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'finishes'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Columns in finishes table:');
      finishesColumnsResult.rows.forEach(row => {
        console.log(` - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('\n❌ finishes table does not exist');
    }
    
    // Check if the updated_at column exists in rooms table
    const roomsColumnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'rooms'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Columns in rooms table:');
    roomsColumnsResult.rows.forEach(row => {
      console.log(` - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n✅ Database schema check complete');
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
