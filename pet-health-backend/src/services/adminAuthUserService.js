function compactText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

export function validateAdminAccountPassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    const err = new Error('Password must be at least 6 characters.');
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    throw err;
  }
}

export function isAlreadyRegistered(error) {
  const text = [error?.message, String(error?.code ?? ''), String(error?.status ?? '')].filter(Boolean).join(' ');
  return /already|registered|exists/i.test(text);
}

export async function findAuthUserByEmail(admin, email) {
  const target = compactText(email).toLowerCase();
  if (!target) return null;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = (data?.users ?? []).find((user) => (user.email ?? '').toLowerCase() === target);
    if (match) return match;
    if ((data?.users ?? []).length < 200) break;
  }
  return null;
}

export async function resolveAdminCreatedAuthUser(admin, { authEmail, password, metadata }) {
  const created = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (!created.error) {
    return { user: created.data?.user ?? null, created: true };
  }

  if (!isAlreadyRegistered(created.error)) {
    throw created.error;
  }

  const existing = await findAuthUserByEmail(admin, authEmail);
  if (!existing?.id) {
    const err = new Error('Login name already exists but could not be loaded.');
    err.status = 409;
    err.code = 'ACCOUNT_ALREADY_EXISTS';
    throw err;
  }

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata ?? {}),
      ...metadata,
    },
  });
  if (updated.error) throw updated.error;
  return { user: updated.data?.user ?? null, created: false };
}
