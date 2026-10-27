/* =========================================================
   TRAINLY - supabase-config.js
   De onde o site lê e grava os dados.

   DATA_SOURCE:
     "supabase" -> mesmo banco do app (padrão). Tudo que for criado no site
                   aparece no app, e vice-versa.
     "mysql"    -> volta para a API PHP + MySQL antiga (api/index.php), caso
                   precise desfazer a integração rapidinho.

   A chave abaixo é a chave PÚBLICA (anon/publishable) do Supabase, a mesma
   do .env do app. Ela pode ficar no navegador: quem protege os dados são as
   regras (RLS) do banco. NUNCA coloque aqui a chave "service_role".
   ========================================================= */
window.TRAINLY_CONFIG = {
  DATA_SOURCE: "supabase",
  SUPABASE_URL: "https://nnqgdzfsjclwqpqqzniw.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_HjyBV442xux_JZINMfTSgw_uzgm0Aew"
};
