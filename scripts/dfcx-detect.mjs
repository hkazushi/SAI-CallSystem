import { GoogleAuth } from 'google-auth-library';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sa = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON);
const auth = new GoogleAuth({
  credentials: sa,
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/dialogflow'],
});

const client = await auth.getClient();
const token = (await client.getAccessToken()).token;

const list = await fetch(
  'https://asia-northeast1-dialogflow.googleapis.com/v3/projects/sai-callsystem-dev/locations/asia-northeast1/agents',
  { headers: { Authorization: `Bearer ${token}` } },
);
const data = await list.json();
const filter = process.argv[2] ?? 'test-007';
const target = data.agents?.findLast?.((a) => a.displayName.includes(filter)) ?? data.agents?.find((a) => a.displayName.includes(filter));
if (!target) {
  console.log('NOT FOUND. agents=', JSON.stringify(data.agents?.map((a) => a.displayName) ?? data, null, 2));
  process.exit(1);
}
console.log('Agent:', target.displayName);
console.log('Name:', target.name);

const sessionId = `sess-${Date.now()}`;
const url = `https://asia-northeast1-dialogflow.googleapis.com/v3/${target.name}/sessions/${sessionId}:detectIntent`;
const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ queryInput: { text: { text: 'こんにちは' }, languageCode: 'ja' } }),
});
const result = await res.json();
console.log('=== detectIntent response ===');
console.log('Status:', res.status);
console.log('Response messages:', JSON.stringify(result.queryResult?.responseMessages, null, 2));
console.log('Current page:', result.queryResult?.currentPage?.displayName);
console.log('Match intent:', result.queryResult?.match?.intent?.displayName);
if (result.error) console.log('Error:', JSON.stringify(result.error, null, 2));
