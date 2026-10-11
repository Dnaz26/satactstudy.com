import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type StoredMessage = { role: string; content: string }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ threads: [] })
  try {
    const admin = createAdminClient()
    const { data: conversations } = await admin
      .from('ai_conversations')
      .select('id, created_at, context')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(24)
    const ids = (conversations ?? []).map((row) => row.id)
    const { data: messages } = ids.length
      ? await admin
        .from('ai_messages')
        .select('conversation_id, role, content, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: true })
      : { data: [] as Array<{ conversation_id: string; role: string; content: string }> }
    const grouped = new Map<string, StoredMessage[]>()
    for (const message of messages ?? []) {
      const list = grouped.get(message.conversation_id) ?? []
      list.push({ role: message.role, content: message.content })
      grouped.set(message.conversation_id, list)
    }
    return NextResponse.json({
      threads: (conversations ?? []).map((row) => {
        const threadMessages = grouped.get(row.id) ?? []
        const title = threadMessages.find((item) => item.role === 'user')?.content.slice(0, 64) || row.context || 'Chat'
        return { id: row.id, title, updatedAt: row.created_at ?? new Date().toISOString(), messages: threadMessages }
      }),
    })
  } catch {
    return NextResponse.json({ threads: [] })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const body = await request.json().catch(() => null) as { id?: string; title?: string; messages?: StoredMessage[] } | null
  if (!body?.id || !Array.isArray(body.messages)) return NextResponse.json({ ok: false }, { status: 400 })
  try {
    const admin = createAdminClient()
    const { data: existing } = await admin.from('ai_conversations').select('id, user_id').eq('id', body.id).maybeSingle()
    if (existing && existing.user_id !== user.id) return NextResponse.json({ ok: false }, { status: 403 })
    if (!existing) {
      const { error } = await admin.from('ai_conversations').insert({
        id: body.id,
        user_id: user.id,
        context: (body.title ?? 'Chat').slice(0, 120),
      })
      if (error) return NextResponse.json({ ok: false })
    }
    await admin.from('ai_messages').delete().eq('conversation_id', body.id)
    const rows = body.messages.filter((item) => item.content?.trim()).slice(-40).map((item) => ({
      conversation_id: body.id as string,
      role: item.role === 'user' ? 'user' : 'assistant',
      content: item.content.slice(0, 4000),
    }))
    if (rows.length) {
      const { error } = await admin.from('ai_messages').insert(rows)
      if (error) return NextResponse.json({ ok: false })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
