const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZWR1aXhxaWdvcGZicWt2aWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAyODU3NCwiZXhwIjoyMDg5NjA0NTc0fQ.MPqV4_vb65A8ywZNKFV58t9FxbBMtX7EaqOXyCTdQ0g';
const baseUrl = 'https://kreduixqigopfbqkvicw.supabase.co/rest/v1';

async function updateTable(table, field, fromId, toId) {
  const url = `${baseUrl}/${table}?${field}=eq.${fromId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ [field]: toId })
  });
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    console.log(`Migrado ${data.length} registros em ${table}.${field} (de ${fromId} para ${toId})`);
  }
}

async function main() {
  const targetUserId = 1; // leobatisti@gmail.com
  const sourceUserId = 3; // leobatisti@hotmail.com

  console.log('--- INICIANDO UNIFICAÇÃO DAS CONTAS ---');

  // Migrar tabelas
  await updateTable('financial_transactions', 'user_id', sourceUserId, targetUserId);
  await updateTable('offers', 'user_id', sourceUserId, targetUserId);
  await updateTable('offers', 'buyer_id', sourceUserId, targetUserId);
  await updateTable('offers', 'seller_id', sourceUserId, targetUserId);
  await updateTable('properties', 'owner_id', sourceUserId, targetUserId);
  await updateTable('reservations', 'user_id', sourceUserId, targetUserId);
  await updateTable('reservations', 'host_id', sourceUserId, targetUserId);
  await updateTable('reservations', 'guest_id', sourceUserId, targetUserId);
  await updateTable('coupons', 'user_id', sourceUserId, targetUserId);
  await updateTable('user_credits', 'user_id', sourceUserId, targetUserId);
  await updateTable('messages', 'sender_id', sourceUserId, targetUserId);
  await updateTable('conversations', 'host_id', sourceUserId, targetUserId);
  await updateTable('conversations', 'guest_id', sourceUserId, targetUserId);

  // Deletar conta secundária id 3
  const delRes = await fetch(`${baseUrl}/users?id=eq.${sourceUserId}`, {
    method: 'DELETE',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=representation'
    }
  });
  const delData = await delRes.json();
  console.log('CONTA SECUNDÁRIA REMOVIDA:', delData);

  // Verificar estado final dos usuários
  const usersRes = await fetch(`${baseUrl}/users?select=id,email,name,role`, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  const usersData = await usersRes.json();
  console.log('CONTAS FINAIS NO BANCO:');
  console.log(usersData);
}

main().catch(console.error);
