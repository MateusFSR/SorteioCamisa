window.REMOTE_SYNC = {
  // Configuração Supabase
  // Crie uma tabela (ex.: participantes) com colunas:
  // id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  // user_id TEXT UNIQUE NOT NULL,
  // data_json JSONB NOT NULL,
  // updated_at BIGINT
  // A coluna user_id deve ser UNIQUE para que o upsert por usuário funcione.
  // Se você ainda usa a tabela antiga (name, number), essa tabela deve ser
  // substituída ou renomeada, porque o script atual espera o novo formato.
  provider: "supabase",
  supabaseUrl: "https://xlnqgfiarglocnedfibc.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsbnFnZmlhcmdsb2NuZWRmaWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzkyNjgsImV4cCI6MjA5MjAxNTI2OH0.K0s1sp-IpLwpc9APSTpTN2ThxUrws1AT1Iegac34Ylk",
  supabaseTable: "participantes",
  supabaseUserId: "default",

  // Compatibilidade legado (Firebase Realtime Database):
  databaseUrl: "",
  authToken: "",
};
