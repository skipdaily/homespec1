export default async function handler(req, res) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        status: 'ERROR',
        error: 'OpenAI API key not configured',
        hasKey: false
      });
    }

    if (!apiKey.startsWith('sk-')) {
      return res.status(500).json({
        status: 'ERROR', 
        error: 'Invalid OpenAI API key format',
        hasKey: true,
        keyFormat: 'invalid'
      });
    }

    // Test OpenAI API connectivity
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({
        status: 'ERROR',
        error: `OpenAI API returned ${response.status}: ${response.statusText}`,
        details: errorText,
        hasKey: true,
        keyFormat: 'valid'
      });
    }

    const data = await response.json();
    
    res.json({
      status: 'OK',
      message: 'OpenAI API is accessible',
      models: data.data?.slice(0, 5).map(m => m.id) || [],
      totalModels: data.data?.length || 0,
      hasKey: true,
      keyFormat: 'valid'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
