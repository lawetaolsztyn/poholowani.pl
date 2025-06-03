import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const run = async () => {
  const now = new Date()
  // odcinamy godziny – zostaje tylko YYYY-MM-DD
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const cutoff = new Date(today.getTime() - 24 * 60 * 60 * 1000) // wczorajsza data

  const cutoffISO = cutoff.toISOString().split('T')[0] // tylko YYYY-MM-DD

  const { data, error } = await supabase
    .from('routes')
    .delete()
    .lt('date', cutoffISO) // usuwamy jeśli 'date' < wczoraj

  if (error) {
    console.error('❌ Błąd przy czyszczeniu tras:', error.message)
    process.exit(1)
  }

  console.log(`✅ Usunięto ${data ? data.length : 0} przeterminowanych tras z datą mniejszą niż ${cutoffISO}`)
}

run()
