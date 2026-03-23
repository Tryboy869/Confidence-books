#!/bin/bash

echo ""
echo "🚀 Confidence Book — Déploiement automatique"
echo "============================================"
echo ""

# Demander les clés manquantes
echo "📋 Étape 1/2 — Clé Supabase Service Role"
echo "   → Va sur : https://supabase.com/dashboard/project/sozreljxxucojlgnuaej/settings/api"
echo "   → Section 'Project API keys' → copie la clé 'service_role'"
echo ""
read -p "   Colle ta SUPABASE_SERVICE_ROLE_KEY ici : " SERVICE_ROLE_KEY

echo ""
echo "📋 Étape 2/2 — Clé Groq"
echo "   → Va sur : https://console.groq.com/keys"
read -p "   Colle ta GROQ_API_KEY ici : " GROQ_KEY

echo ""
echo "⚙️  Configuration du projet..."

# Générer un JWT secret fort
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n/+=')
CLEANUP_SECRET=$(openssl rand -base64 24 | tr -d '\n/+=')

# Mettre à jour .env.local
cat > .env.local << ENVEOF
NEXT_PUBLIC_SUPABASE_URL=https://sozreljxxucojlgnuaej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvenJlbGp4eHVjb2psZ251YWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODg4ODAsImV4cCI6MjA4OTc2NDg4MH0.7yxlhwPnqhG1x8OSE169-M4p7hQ2xGiBnffwfmrZJyI
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
JWT_SECRET=${JWT_SECRET}
GROQ_API_KEY=${GROQ_KEY}
CLEANUP_SECRET=${CLEANUP_SECRET}
ENVEOF

echo "✅ .env.local configuré"

# Build test
echo ""
echo "🔨 Test de build..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build échoué. Vérifie les erreurs ci-dessus."
  exit 1
fi

echo ""
echo "🌐 Déploiement sur Vercel..."

# Deploy avec toutes les env vars
npx vercel deploy --prod \
  --env NEXT_PUBLIC_SUPABASE_URL="https://sozreljxxucojlgnuaej.supabase.co" \
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvenJlbGp4eHVjb2psZ251YWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODg4ODAsImV4cCI6MjA4OTc2NDg4MH0.7yxlhwPnqhG1x8OSE169-M4p7hQ2xGiBnffwfmrZJyI" \
  --env SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
  --env JWT_SECRET="$JWT_SECRET" \
  --env GROQ_API_KEY="$GROQ_KEY" \
  --env CLEANUP_SECRET="$CLEANUP_SECRET" \
  --yes

echo ""
echo "🎉 Déploiement terminé !"
