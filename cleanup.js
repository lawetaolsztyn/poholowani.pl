import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const run = async () => {
  const now = new Date()
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('routes')
    .delete()
    .lt('date', cutoff.toISOString())

  if (error) {
    console.error('❌ Błąd przy czyszczeniu tras:', error.message)
    process.exit(1)
  }

  console.log(`✅ Usunięto ${data ? data.length : 0} przeterminowanych tras`)
}


run()
