CREATE TABLE operations_audit (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES customer(id), target_id TEXT NOT NULL,
  action TEXT NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
