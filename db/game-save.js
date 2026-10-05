// Each save is a single atomic, parameterized statement. No runtime DDL.
export function saveStore(binding) {
  if (!binding) throw new Error('Missing DB binding');
  const db = binding.withSession ? binding.withSession('first-primary') : binding;
  return {
    read(userId) {
      return db.prepare('SELECT payload, revision, write_id, updated_at FROM game_saves WHERE user_id = ?')
        .bind(userId).first();
    },
    write(userId, payload, expectedRevision, writeId) {
      const now = new Date().toISOString();
      if (expectedRevision === 0) {
        return db.prepare('INSERT INTO game_saves (user_id, payload, revision, write_id, updated_at) VALUES (?, ?, 1, ?, ?) ON CONFLICT(user_id) DO NOTHING RETURNING payload, revision, write_id, updated_at')
          .bind(userId, payload, writeId, now).first();
      }
      return db.prepare('UPDATE game_saves SET payload = ?, revision = revision + 1, write_id = ?, updated_at = ? WHERE user_id = ? AND revision = ? RETURNING payload, revision, write_id, updated_at')
        .bind(payload, writeId, now, userId, expectedRevision).first();
    },
  };
}
