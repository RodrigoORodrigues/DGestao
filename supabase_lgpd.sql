-- Tabela de versões dos termos LGPD
CREATE TABLE IF NOT EXISTS lgpd_terms_versions (
    id uuid primary key default gen_random_uuid(),
    version text not null,
    title text not null,
    content text not null,
    content_hash text not null,
    status text default 'active',
    created_by text,
    created_at timestamp with time zone default now(),
    published_at timestamp with time zone default now()
);

-- Tabela de aceites
CREATE TABLE IF NOT EXISTS lgpd_acceptances (
    id uuid primary key default gen_random_uuid(),
    user_id integer,
    username text not null,
    cliente_id integer,
    cliente_nome text,
    empresa text,
    term_version_id uuid references lgpd_terms_versions(id),
    term_version text not null,
    accepted_at timestamp with time zone default now(),
    ip_address text,
    user_agent text,
    acceptance_hash text not null,
    accepted boolean default true,
    accepted_text_snapshot text not null,
    consent_snapshot jsonb,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Adicionar colunas na tabela users, caso não existam
-- Você pode precisar ajustar o tipo do id conforme a sua tabela users (se bigint/uuid)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='must_accept_terms') THEN
        ALTER TABLE users ADD COLUMN must_accept_terms boolean default true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='accepted_latest_terms') THEN
        ALTER TABLE users ADD COLUMN accepted_latest_terms boolean default false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_terms_acceptance_id') THEN
        ALTER TABLE users ADD COLUMN last_terms_acceptance_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='terms_accepted_at') THEN
        ALTER TABLE users ADD COLUMN terms_accepted_at timestamp with time zone;
    END IF;
END $$;
