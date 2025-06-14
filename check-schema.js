import postgres from 'postgres';
import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log(`🔍 Connecting to database: ${dbUrl.substring(0, 25)}...`);

const sql = postgres(dbUrl, {
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkColumns(tableName) {
  console.log(`\n📋 Checking columns for table: ${tableName}`);
  try {
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;

    if (columns.length === 0) {
      console.log(`❌ Table ${tableName} does not exist or has no columns`);
      return;
    }

    console.log(`Found ${columns.length} columns:`);
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
    });
  } catch (error) {
    console.error(`❌ Error checking columns for table ${tableName}:`, error);
  }
}

async function main() {
  try {
    // List all tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    console.log(`\n📊 Found ${tables.length} tables in schema 'public':`);
    tables.forEach(t => console.log(`- ${t.table_name}`));
    
    // Check columns for important tables
    await checkColumns('rooms');
    await checkColumns('projects');
    await checkColumns('conversations');
    await checkColumns('messages');
    await checkColumns('chat_settings');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
    console.log('\n✅ Completed schema check');
  }
}

main();
