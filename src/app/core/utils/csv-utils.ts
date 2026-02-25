export function detectCSVType(headers: string[]): string {
  const headerLower = headers.map(h => h.toLowerCase());
  
  if (headerLower.includes('score') && (headerLower.includes('nps') || headerLower.includes('promoter'))) {
    return 'nps_survey';
  }
  if (headerLower.includes('rating') && headerLower.includes('review')) {
    return 'app_review';
  }
  if (headerLower.includes('complaint') || headerLower.includes('issue')) {
    return 'complaint';
  }
  if (headerLower.includes('content') && headerLower.includes('source')) {
    return 'social_media';
  }
  
  return 'unknown';
}

export function suggestColumnMappings(
  csvHeaders: string[],
  targetType: string
): Record<string, string> {
  const mappings: Record<string, string> = {};
  const headerLower = csvHeaders.map(h => h.toLowerCase());
  
  const fieldSynonyms: Record<string, string[]> = {
    content: ['content', 'text', 'message', 'comment', 'feedback', 'review', 'description'],
    source: ['source', 'platform', 'channel', 'origin'],
    author: ['author', 'user', 'customer', 'reviewer', 'name', 'username'],
    date: ['date', 'timestamp', 'created_at', 'created', 'time', 'datetime'],
    rating: ['rating', 'score', 'stars', 'star_rating', 'rate'],
    score: ['score', 'nps_score', 'rating', 'value'],
    comment: ['comment', 'feedback', 'text', 'content', 'message'],
    customerId: ['customer_id', 'user_id', 'client_id', 'id'],
    category: ['category', 'type', 'classification']
  };

  const targetFields: Record<string, string[]> = {
    social_media: ['content', 'source', 'author', 'date', 'rating'],
    app_review: ['content', 'source', 'author', 'date', 'rating'],
    nps_survey: ['score', 'comment', 'customerId', 'date'],
    complaint: ['content', 'source', 'date', 'category']
  };

  const fields = targetFields[targetType] || targetFields['social_media'];

  for (const field of fields) {
    const synonyms = fieldSynonyms[field] || [];
    const match = csvHeaders.find(h => {
      const hLower = h.toLowerCase();
      return synonyms.some(syn => hLower.includes(syn) || syn.includes(hLower));
    });
    if (match) {
      mappings[match] = field;
    }
  }

  return mappings;
}
