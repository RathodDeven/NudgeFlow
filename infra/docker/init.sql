CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  knowledge_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  external_user_id TEXT NOT NULL,
  full_name TEXT,
  phone_e164 TEXT NOT NULL,
  locale_hint TEXT,
  city TEXT,
  state TEXT,
  consent_provided BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, external_user_id)
);

CREATE TABLE IF NOT EXISTS loan_cases (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  partner_case_id TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  loan_amount DECIMAL(12,2),
  firm_name TEXT,
  is_reactivated BOOLEAN NOT NULL DEFAULT FALSE,
  deep_link TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, partner_case_id)
);

CREATE TABLE IF NOT EXISTS dropoff_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  loan_case_id UUID NOT NULL REFERENCES loan_cases(id),
  dropped_at_stage TEXT NOT NULL,
  dropped_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  loan_case_id UUID NOT NULL REFERENCES loan_cases(id),
  is_agent_active BOOLEAN NOT NULL DEFAULT TRUE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  summary_state JSONB NOT NULL,
  compact_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_count INT NOT NULL DEFAULT 0,
  token_estimate INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id),
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  provider_message_id TEXT,
  body TEXT NOT NULL,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followup_tasks (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  due_at TIMESTAMPTZ NOT NULL,
  attempt_number INT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  experiment_arm TEXT
);

CREATE TABLE IF NOT EXISTS policy_states (
  session_id UUID PRIMARY KEY REFERENCES conversation_sessions(id),
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out BOOLEAN NOT NULL DEFAULT FALSE,
  non_responsive BOOLEAN NOT NULL DEFAULT FALSE,
  attempts_in_window INT NOT NULL DEFAULT 0,
  window_start_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  source TEXT NOT NULL,
  evidence_ref TEXT,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS handoff_events (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id),
  changed_by TEXT NOT NULL,
  mode TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_poll_results (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  loan_case_id UUID NOT NULL REFERENCES loan_cases(id),
  previous_stage TEXT NOT NULL,
  polled_stage TEXT NOT NULL,
  progressed BOOLEAN NOT NULL,
  provider_ref TEXT,
  polled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  experiment_key TEXT NOT NULL,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
