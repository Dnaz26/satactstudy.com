import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Database, CheckCircle, AlertCircle } from 'lucide-react'

export default async function DatabaseHealthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const tables = [
    'profiles', 'questions', 'attempts', 'topic_mastery',
    'practice_sessions', 'study_plans', 'study_plan_tasks',
    'vocabulary_words', 'vocabulary_attempts', 'ai_usage',
    'user_usage_daily', 'subscriptions', 'access_codes',
    'score_predictions', 'performance_snapshots',
  ]

  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table as 'profiles')
        .select('*', { count: 'exact', head: true })
      return { table, count: count ?? 0, error: error?.message ?? null }
    })
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-signal" />
        <h1 className="text-2xl font-bold text-paper">Database Health</h1>
        <Badge variant="success">Connected</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Table Row Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {counts.map(({ table, count, error }) => (
              <div
                key={table}
                className="flex items-center justify-between p-3 rounded-xl border border-transparent neu-inset"
              >
                <div className="flex items-center gap-2">
                  {error ? (
                    <AlertCircle className="w-4 h-4 text-bad" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-ok" />
                  )}
                  <span className="text-sm font-mono text-paper">{table}</span>
                </div>
                <span className={`text-sm font-bold ${error ? 'text-bad' : 'text-paper'}`}>
                  {error ? 'Error' : count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <CheckCircle className="w-5 h-5 text-ok" />
            <div>
              <p className="text-sm font-semibold text-ok">satactstudy.com connected</p>
              <p className="font-mono text-xs text-fog">https://skauxjewikafoyymhcgn.supabase.co</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
