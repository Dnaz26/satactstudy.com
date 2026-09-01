import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

export default async function AdminQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_text, difficulty, test_type, topic_name, approved, active, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-paper">Question Management</h1>
        <Link href="/admin/import">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Import Questions
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Questions ({questions?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-transparent">
                  {['Question', 'Test', 'Topic', 'Difficulty', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-fog font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {questions?.map((q) => (
                  <tr key={q.id} className="hover:bg-panel-2 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-paper">{q.question_text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{q.test_type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-fog">{q.topic_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={q.difficulty === 'Hard' || q.difficulty === 'hard' ? 'danger' : q.difficulty === 'Medium' || q.difficulty === 'medium' ? 'warning' : 'success'} className="capitalize">
                        {q.difficulty}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={q.approved ? 'success' : 'warning'}>
                        {q.approved ? 'approved' : 'pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-fog">{q.created_at ? formatDate(q.created_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!q.approved && (
                          <form action={`/api/admin/questions/status`} method="post">
                            <input type="hidden" name="questionId" value={q.id} />
                            <input type="hidden" name="status" value="approved" />
                            <Button size="sm" variant="success" type="submit">Approve</Button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
