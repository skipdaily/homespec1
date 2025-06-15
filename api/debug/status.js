export default function handler(req, res) {
  try {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || 'N/A',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
