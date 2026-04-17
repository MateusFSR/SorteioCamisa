window.REMOTE_SYNC = {
  // Configuração Supabase
  // Crie uma tabela (ex.: participantes) com colunas:
  // id (bigint identity PK), name (text), number (int unique)
  provider: "supabase",
  supabaseUrl: "https://xlnqgfiarglocnedfibc.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsbnFnZmlhcmdsb2NuZWRmaWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzkyNjgsImV4cCI6MjA5MjAxNTI2OH0.K0s1sp-IpLwpc9APSTpTN2ThxUrws1AT1Iegac34Ylk",
  supabaseTable: "participantes",

  // Compatibilidade legado (Firebase Realtime Database):
  databaseUrl: "",
  authToken: "",
};
