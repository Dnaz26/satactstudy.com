import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLevel } from '@/lib/study/levels'
import { RefreshPractice } from '../../refresh-practice'
export default async function RefreshTopicPage({params}:{params:Promise<{track:string;level:string}>}) {
  const {track,level} = await params
  if ((track !== 'math' && track !== 'english') || !/^\d+$/.test(level)) notFound()
  const topic = getLevel(track,Number(level))
  if (!topic) notFound()
  const db = await createClient()
  const {data:{user}} = await db.auth.getUser()
  if (!user) redirect('/login')
  return <RefreshPractice key={`${track}-${level}`} level={topic} />
}
