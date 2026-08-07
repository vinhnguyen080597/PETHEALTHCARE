import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const {
  listAdminActionLogs,
  recordAdminAction,
  __resetAdminActionLogsMemoryForTests,
} = await import('../src/repositories/adminActionLogRepository.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('recordAdminAction rejects missing action or targetType', async () => {
  __resetAdminActionLogsMemoryForTests();
  assert.equal(await recordAdminAction({ action: '', targetType: 'pet' }), null);
  assert.equal(await recordAdminAction({ action: 'pet.create', targetType: '' }), null);
  const listed = await listAdminActionLogs({ limit: 10 });
  assert.equal(listed.data.length, 0);
});

test('recordAdminAction stores pet and care_record audit rows in memory', async () => {
  __resetAdminActionLogsMemoryForTests();

  const petCreate = await recordAdminAction({
    actorUserId: 'admin-1',
    viaSecret: false,
    action: 'pet.create',
    targetType: 'pet',
    targetId: 'pet-1',
    targetUserId: 'user-1',
    beforeState: {},
    afterState: { id: 'pet-1', name: 'Mochi', species: 'cat' },
    metadata: { owner_email: 'owner@example.com' },
  });
  assert.ok(petCreate?.id);
  assert.equal(petCreate.action, 'pet.create');
  assert.equal(petCreate.target_type, 'pet');
  assert.equal(petCreate.target_id, 'pet-1');
  assert.equal(petCreate.actor_via_secret, false);
  assert.equal(petCreate.after_state.name, 'Mochi');

  await sleep(5);

  const careDelete = await recordAdminAction({
    actorUserId: null,
    viaSecret: true,
    action: 'care_record.delete',
    targetType: 'care_record',
    targetId: 'care-9',
    targetUserId: 'user-1',
    beforeState: { id: 'care-9', type: 'vaccine', title: 'Rabies' },
    afterState: {},
    metadata: { pet_id: 'pet-1' },
  });
  assert.equal(careDelete.action, 'care_record.delete');
  assert.equal(careDelete.actor_via_secret, true);
  assert.equal(careDelete.before_state.title, 'Rabies');

  const listed = await listAdminActionLogs({ limit: 10 });
  assert.equal(listed.data.length, 2);
  assert.equal(listed.data[0].action, 'care_record.delete');
  assert.equal(listed.data[1].action, 'pet.create');
  assert.equal(listed.next_cursor, null);
});

test('listAdminActionLogs filters by action and targetType', async () => {
  __resetAdminActionLogsMemoryForTests();

  await recordAdminAction({
    action: 'pet.create',
    targetType: 'pet',
    targetId: 'p1',
    targetUserId: 'u1',
  });
  await recordAdminAction({
    action: 'pet.update',
    targetType: 'pet',
    targetId: 'p1',
    targetUserId: 'u1',
  });
  await recordAdminAction({
    action: 'care_record.create',
    targetType: 'care_record',
    targetId: 'c1',
    targetUserId: 'u1',
  });
  await recordAdminAction({
    action: 'breeder.verify',
    targetType: 'breeder_profile',
    targetId: 'b1',
    targetUserId: 'u2',
  });

  const petsOnly = await listAdminActionLogs({ action: 'pet.create' });
  assert.equal(petsOnly.data.length, 1);
  assert.equal(petsOnly.data[0].action, 'pet.create');

  const careType = await listAdminActionLogs({ targetType: 'care_record' });
  assert.equal(careType.data.length, 1);
  assert.equal(careType.data[0].target_id, 'c1');

  const user1 = await listAdminActionLogs({ targetUserId: 'u1' });
  assert.equal(user1.data.length, 3);
});

test('listAdminActionLogs paginates with next_cursor', async () => {
  __resetAdminActionLogsMemoryForTests();

  for (let i = 0; i < 5; i += 1) {
    await recordAdminAction({
      action: 'account.update',
      targetType: 'account',
      targetId: `acc-${i}`,
      targetUserId: `user-${i}`,
      metadata: { index: i },
    });
    await sleep(2);
  }

  const page1 = await listAdminActionLogs({ limit: 2 });
  assert.equal(page1.data.length, 2);
  assert.equal(typeof page1.next_cursor, 'string');

  const page2 = await listAdminActionLogs({ limit: 2, cursor: page1.next_cursor });
  assert.equal(page2.data.length, 2);
  assert.equal(typeof page2.next_cursor, 'string');

  const ids = new Set([...page1.data, ...page2.data].map((row) => row.id));
  assert.equal(ids.size, 4);

  const page3 = await listAdminActionLogs({ limit: 2, cursor: page2.next_cursor });
  assert.equal(page3.data.length, 1);
  assert.equal(page3.next_cursor, null);
  assert.ok(!ids.has(page3.data[0].id));
});
