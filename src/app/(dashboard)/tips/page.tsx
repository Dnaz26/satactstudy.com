import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb } from 'lucide-react'

const TIPS = [
  { category: 'Test Strategy', tips: [
    { title: 'Process of Elimination', content: 'Always eliminate obviously wrong answers first. Even eliminating one choice improves your odds significantly.' },
    { title: 'Time Management', content: 'On the SAT, spend no more than 75-90 seconds per question. If stuck, mark and move on.' },
    { title: 'Read the Question First', content: 'For reading passages, read the question before the passage to know what to look for.' },
  ]},
  { category: 'Math Tips', tips: [
    { title: 'Plug in Numbers', content: 'When you see variables, try plugging in simple numbers (2, 5, 10) to test answer choices.' },
    { title: 'Work Backwards', content: 'For multiple choice, try plugging the answer choices back into the problem to find which works.' },
    { title: 'Draw It Out', content: 'Geometry problems become much easier when you draw a clear diagram with all given information.' },
  ]},
  { category: 'Reading Tips', tips: [
    { title: 'Find the Evidence', content: 'For "best evidence" questions, the answer to the previous question should point to specific lines.' },
    { title: 'Vocabulary in Context', content: 'For vocab questions, ignore the usual meaning. Find what makes sense in THIS specific context.' },
    { title: 'Author\'s Tone', content: 'Look for charged words (always, never, must, perhaps) to determine how certain the author is.' },
  ]},
  { category: 'Writing Tips', tips: [
    { title: 'Read It Aloud', content: 'If something sounds wrong when you read it aloud, it probably is. Trust your ear.' },
    { title: 'Concision', content: 'The SAT rewards concise writing. If two choices are grammatically correct, pick the shorter one.' },
    { title: 'Transitions', content: 'Choose transitions based on the logical relationship between ideas: contrast (however), causation (therefore), addition (furthermore).' },
  ]},
  { category: 'Test Day', tips: [
    { title: 'Sleep & Eat Well', content: 'Get at least 8 hours of sleep the night before. Eat a protein-rich breakfast to maintain focus.' },
    { title: 'Arrive Early', content: 'Arrive 30 minutes before the exam to settle in, reduce anxiety, and get comfortable.' },
    { title: 'Stay Calm', content: 'If you panic, take 3 deep breaths. Remember: you can skip hard questions and come back.' },
  ]},
]

export default function TipsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-paper mb-1 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-400" />
          Tips &amp; Strategies
        </h1>
        <p className="text-fog">Expert strategies to boost your SAT &amp; ACT score.</p>
      </div>

      {TIPS.map((section) => (
        <div key={section.category}>
          <h2 className="text-lg font-semibold text-paper mb-3 flex items-center gap-2">
            <Badge variant="warning">{section.category}</Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {section.tips.map((tip) => (
              <Card key={tip.title}>
                <CardHeader>
                  <CardTitle className="text-base">{tip.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-fog leading-relaxed">{tip.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
