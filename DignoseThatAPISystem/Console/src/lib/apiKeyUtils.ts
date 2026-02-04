// API key generation utilities

export async function generateApiKey(): Promise<{
  apiKey: string;
  keyPrefix: string;
  keyHash: string;
}> {
  // Generate a random API key
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  const apiKey = `dt_${Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  const keyPrefix = apiKey.substring(0, 10);

  // Hash the key with SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { apiKey, keyPrefix, keyHash };
}
