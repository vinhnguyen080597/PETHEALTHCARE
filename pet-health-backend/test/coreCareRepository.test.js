import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  createCoreCareRecord,
  deleteCoreCareRecord,
  getCoreCareRecordById,
  updateCoreCareRecord,
  __resetCoreCareMemoryForTests,
} = await import('../src/repositories/coreCareRepository.js');

test('getCoreCareRecordById returns created record and null after delete', async () => {
  __resetCoreCareMemoryForTests();
  const userId = `care-user-${Date.now()}`;
  const petId = `care-pet-${Date.now()}`;

  const created = await createCoreCareRecord(
    userId,
    petId,
    { type: 'vaccine', title: 'Rabies', status: 'active' },
    null,
  );
  assert.ok(created?.id);

  const found = await getCoreCareRecordById(userId, created.id, null);
  assert.equal(found?.id, created.id);
  assert.equal(found?.title, 'Rabies');
  assert.equal(found?.pet_id, petId);

  const updated = await updateCoreCareRecord(userId, created.id, { title: 'Rabies booster' }, null);
  assert.equal(updated?.title, 'Rabies booster');

  const afterUpdate = await getCoreCareRecordById(userId, created.id, null);
  assert.equal(afterUpdate?.title, 'Rabies booster');

  const deleted = await deleteCoreCareRecord(userId, created.id, null);
  assert.equal(deleted, true);
  assert.equal(await getCoreCareRecordById(userId, created.id, null), null);
});

test('getCoreCareRecordById returns null for unknown ids', async () => {
  __resetCoreCareMemoryForTests();
  assert.equal(await getCoreCareRecordById('u1', 'missing', null), null);
  assert.equal(await getCoreCareRecordById('', 'x', null), null);
  assert.equal(await getCoreCareRecordById('u1', '', null), null);
});
