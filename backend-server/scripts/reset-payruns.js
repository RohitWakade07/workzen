// Script to reset/clean payruns table
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'workzen_hrms',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function resetPayruns() {
  try {
    console.log('Connecting to database...')
    
    // Delete all payruns
    const result = await pool.query('DELETE FROM payruns')
    console.log(`✅ Deleted ${result.rowCount} payrun records`)
    
    // Verify
    const verify = await pool.query('SELECT COUNT(*) FROM payruns')
    console.log(`📊 Remaining payruns: ${verify.rows[0].count}`)
    
    console.log('\n✅ Payruns table cleaned successfully!')
  } catch (error) {
    console.error('❌ Error resetting payruns:', error.message)
  } finally {
    await pool.end()
  }
}

resetPayruns()
