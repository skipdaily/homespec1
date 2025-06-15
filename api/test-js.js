export default function handler(req, res) {
  try {
    res.status(200).json({
      message: 'Test endpoint working (JS)',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      environment: process.env.NODE_ENV || 'unknown',
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test endpoint failed',
      message: error.message || 'Unknown error'
    });
  }
}
