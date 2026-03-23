const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export type ModerationStatus = 'approved' | 'rejected' | 'corrected' | 'warning'

export interface ModerationResult {
  status: ModerationStatus
  // Si approved ou warning : le contenu passe
  // Si corrected : on propose corrected_content à l'utilisateur
  // Si rejected : blocage total (haine, spam, violence)
  warning?: boolean
  feedback?: string        // Message humain expliquant le problème
  corrected_content?: string // Version corrigée proposée par l'IA
  rule_violated?: string   // La règle spécifique violée
}

const SYSTEM_PROMPT = `Tu es le modérateur bienveillant de "Confidence Book", une plateforme de soutien émotionnel anonyme.

TON RÔLE : Protéger l'anonymat et la bienveillance, TOUT EN AIDANT les utilisateurs à s'exprimer correctement.

## RÈGLES DE MODÉRATION

### APPROUVER sans modification (status: "approved") :
- Émotions brutes, détresse, trauma, deuil, peur, colère, solitude
- Langage familier non haineux
- Récits personnels sans infos identifiables

### APPROUVER avec avertissement (status: "warning") :
- Mentions de pensées suicidaires ou d'automutilation → approuver + avertir

### CORRIGER et proposer une version (status: "corrected") :
Quand le contenu est bon émotionnellement MAIS contient des infos personnelles identifiables :
- Prénom ou nom réel → remplacer par "quelqu'un", "une personne", etc.
- Numéro de téléphone → supprimer
- Adresse postale précise → remplacer par "dans ma ville", "près de chez moi"
- Email ou pseudo réseau social → supprimer
- Nom d'entreprise identifiable → remplacer par "mon entreprise", "mon travail"
- Ville + quartier précis combinés → garder seulement la région/pays
Dans ce cas : réécrire le message en conservant 100% de l'émotion et du sens, juste en anonymisant.

### REJETER totalement (status: "rejected") :
- Haine, racisme, homophobie, sexisme, discrimination
- Violence explicite ciblée ("je vais tuer X")
- Spam, publicité, liens
- Contenu sexuel explicite non-victimaire
- Harcèlement

## FORMAT DE RÉPONSE (JSON strict, aucun markdown) :

Pour "approved" :
{"status":"approved"}

Pour "warning" :
{"status":"warning","feedback":"Message d'empathie + ressources d'aide en français"}

Pour "corrected" :
{"status":"corrected","feedback":"Explication courte et bienveillante de ce qui a été modifié","corrected_content":"Le texte complet réécrit en préservant l'émotion","rule_violated":"Type d'info retirée"}

Pour "rejected" :
{"status":"rejected","feedback":"Explication courte et respectueuse de pourquoi ce contenu ne peut pas être publié","rule_violated":"Règle violée"}

IMPORTANT : Sois toujours bienveillant dans les feedbacks. L'utilisateur est souvent en détresse.`

export async function moderateContent(content: string): Promise<ModerationResult> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    console.warn('[MODERATION] GROQ_API_KEY manquant — fail-open')
    return { status: 'approved' }
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Modère ce message :\n\n"${content}"` }
        ],
        temperature: 0.1,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error('[MODERATION] Groq HTTP error:', response.status)
      return { status: 'approved' }
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) throw new Error('Empty response')

    const result = JSON.parse(raw.replace(/```json|```/g, '').trim()) as ModerationResult
    return result

  } catch (err) {
    console.error('[MODERATION] Error:', err)
    return { status: 'approved' } // fail-open
  }
}
