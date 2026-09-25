const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZWR1aXhxaWdvcGZicWt2aWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAyODU3NCwiZXhwIjoyMDg5NjA0NTc0fQ.MPqV4_vb65A8ywZNKFV58t9FxbBMtX7EaqOXyCTdQ0g';
const baseUrl = 'https://kreduixqigopfbqkvicw.supabase.co/rest/v1';

async function main() {
  const res = await fetch(`${baseUrl}/users?id=eq.1`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      viralizar_credits: 5,
      identity_document_verified: true,
      identity_document_url: 'https://kreduixqigopfbqkvicw.supabase.co/storage/v1/object/public/property-images/identity-documents/user-3-1789654865022-8cb3df2a-6717-46a7-914e-0dade8dcf5dc-2.pdf',
      portfolio_video_url: 'https://kreduixqigopfbqkvicw.supabase.co/storage/v1/object/public/property-images/reels/0-1777510745653.mp4'
    })
  });
  const data = await res.json();
  console.log('CONTA LEBATISTI UNIFICADA E ATUALIZADA COM SUCESSO:');
  console.log(data);
}
main().catch(console.error);
