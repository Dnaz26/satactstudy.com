import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function AdminSourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: docs } = await supabase
    .from('source_documents')
    .select('filename, exam_type, source_type, source_rights_status, processing_status, question_count_detected, question_count_imported, question_count_needing_review, contains_answer_key, page_count')
    .order('exam_type')
    .order('filename')

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <Link href="/admin" className="text-sm text-fog hover:text-paper">Admin</Link>
        <h1 className="text-2xl font-bold text-paper">Exam sources</h1>
        <p className="text-sm text-fog">Official SAT/ACT files stay reference-only. Practice uses original StudentQuest questions.</p>
      </div>
      {(docs ?? []).map((doc) => (
        <Card key={doc.filename}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{doc.filename}</CardTitle>
              <Badge variant="secondary">{doc.exam_type}</Badge>
              <Badge variant={doc.source_rights_status === 'reference_only' ? 'warning' : 'success'}>
                {doc.source_rights_status}
              </Badge>
              <Badge>{doc.processing_status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-fog">
            {doc.page_count} pages · detected {doc.question_count_detected} · imported {doc.question_count_imported} · review {doc.question_count_needing_review}
            {doc.contains_answer_key ? ' · has answer key' : ''}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
