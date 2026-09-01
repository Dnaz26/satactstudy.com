import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MasteryBar } from '@/components/ui/mastery-bar'
import { Badge } from '@/components/ui/badge'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'

type CategoryWithTopics = {
  id: string
  name: string
  sections: { name: string; tests: { name: string } | null } | null
  topics: Array<{ id: string; name: string }>
}

type TopicMasteryRow = {
  topic_id: string
  overall_mastery: number
}

export default async function ReadingWritingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawCategories } = await supabase
    .from('categories')
    .select('id, name, sections(name, tests(name)), topics(id, name)')

  const categories = (rawCategories ?? []) as unknown as CategoryWithTopics[]

  const rwCategories = categories.filter(
    (c) => c.sections?.tests?.name === 'SAT' && c.sections?.name === 'Reading and Writing'
  )

  const allTopicIds = rwCategories.flatMap((c) => c.topics?.map((t) => t.id) ?? [])

  const { data: rawMastery } = await supabase
    .from('topic_mastery')
    .select('topic_id, overall_mastery')
    .eq('user_id', user.id)
    .in('topic_id', allTopicIds.length > 0 ? allTopicIds : ['none'])

  const mastery = (rawMastery ?? []) as TopicMasteryRow[]
  const masteryMap = new Map(mastery.map((m) => [m.topic_id, m.overall_mastery]))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-paper flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-violet-400" />
          Reading &amp; Writing
        </h1>
        <p className="text-fog mt-1">
          SAT Reading &amp; Writing · Craft and Structure, Information and Ideas, Expression of Ideas, Standard English Conventions
        </p>
      </div>

      {rwCategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-fog">
            No categories found. Check back soon.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rwCategories.map((category) => {
            const topics = category.topics ?? []
            const avgMastery = topics.length > 0
              ? topics.reduce((s, t) => s + (masteryMap.get(t.id) ?? 0), 0) / topics.length
              : 0

            return (
              <Card key={category.id} className="hover:opacity-90 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <Badge variant={avgMastery >= 70 ? 'success' : avgMastery >= 40 ? 'warning' : 'danger'}>
                      {Math.round(avgMastery)}%
                    </Badge>
                  </div>
                  <MasteryBar mastery={avgMastery} showPercent={false} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topics.slice(0, 4).map((topic) => {
                      const topicMastery = masteryMap.get(topic.id) ?? 0
                      return (
                        <div key={topic.id} className="flex items-center justify-between">
                          <span className="text-xs text-fog truncate flex-1 mr-2">
                            {topic.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16">
                              <MasteryBar mastery={topicMastery} showPercent={false} />
                            </div>
                            <Link href={`/practice?topicId=${topic.id}`}>
                              <Button size="sm" variant="ghost" className="text-xs h-6 px-2">
                                Practice
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3">
                    <Link href={`/practice?categoryId=${category.id}`}>
                      <Button size="sm" className="w-full">Practice All</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
