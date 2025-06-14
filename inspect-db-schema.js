import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Connect to database
const sql = postgres(DATABASE_URL, { 
  ssl: { rejectUnauthorized: false }  // Allow self-signed certificates
});

async function inspectSchema() {
  try {
    console.log('🔍 Inspecting database schema...\n');
    
    // Get all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log(`📋 Found ${tables.length} tables:\n`);
    
    // For each table, get its columns
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`📊 TABLE: ${tableName}`);
      
      const columns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;
      
      console.log('  Columns:');
      columns.forEach(col => {
        console.log(`    - ${col.column_name} (${col.data_type})${col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL'}${col.column_default ? ' DEFAULT: ' + col.column_default : ''}`);
      });
      
      console.log(''); // Empty line between tables
    }
    
    // Check for specific missing columns
    console.log('🔍 Checking for specific missing columns...');
    
    const projectColumns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'projects';
    `;
    const hasRequirePin = projectColumns.some(col => col.column_name === 'require_pin');
    console.log(`  - projects.require_pin: ${hasRequirePin ? '✅ PRESENT' : '❌ MISSING'}`);
    
    const roomColumns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'rooms';
    `;
    const hasUpdatedAt = roomColumns.some(col => col.column_name === 'updated_at');
    console.log(`  - rooms.updated_at: ${hasUpdatedAt ? '✅ PRESENT' : '❌ MISSING'}`);
    
    console.log('\n✅ Schema inspection complete');
  } catch (error) {
    console.error('❌ Error inspecting schema:', error);
  } finally {
    await sql.end();
  }
}

inspectSchema();
