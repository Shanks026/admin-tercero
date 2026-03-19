import { MessageSquare } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'

export default function FeedbackPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl font-light tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground font-light">Bug reports, feedback, and suggestions</p>
      </div>

      <Empty className="py-32 border border-dashed rounded-2xl bg-muted/5">
        <EmptyContent>
          <EmptyMedia variant="icon">
            <MessageSquare className="size-6 text-muted-foreground/60" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle className="font-normal text-xl">Coming in Phase 3</EmptyTitle>
            <EmptyDescription className="font-light">
              Feedback management will be available after Phase 2 is complete.
            </EmptyDescription>
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    </div>
  )
}
