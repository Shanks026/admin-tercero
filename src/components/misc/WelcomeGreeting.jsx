import { useMemo, useState, useEffect } from 'react'
import { getDay } from 'date-fns'

const NAME = 'Chris'

const GREETINGS = {
  lateNight: [
    "Still at it, {name}? 🌙",
    "Night owl mode, {name}. ☕",
    "Burning the midnight oil, {name}? 🕯️",
    "Late night dispatch, {name}. 🌌",
    "The quiet hours suit you, {name}. 🌙",
    "Working late again, {name}? ☕",
    "Still here, {name}. 🦉",
  ],
  morning: [
    "Morning, {name}. ☀️",
    "Up and at it, {name}. ☕",
    "Early start, {name}. 🌿",
    "A fresh one, {name}. ☀️",
    "Almost Friday, {name}. ⚡",
    "Last push of the week, {name}. 🎉",
    "Weekend check-in, {name}? ☕",
  ],
  afternoon: [
    "Afternoon, {name}. 🌞",
    "Midday, {name}. ☕",
    "Peak hours, {name}. ⚡",
    "Afternoon window, {name}. 🌤️",
    "Almost there, {name}. 🌿",
    "Friday stretch, {name}. 🎉",
    "Weekend's close, {name}. 🌴",
  ],
  evening: [
    "Evening, {name}. 🌆",
    "Good evening, {name}. 🌙",
    "Evening focus, {name}. ⚡",
    "Evening session, {name}. 🌇",
    "Evening window, {name}. ✨",
    "Friday evening, {name}. 🎉",
    "Saturday evening, {name}. 🌙",
  ],
}

const MESSAGES = {
  lateNight: [
    "Worth finishing, or can it wait until morning?",
    "Note where you left off — your future self will thank you.",
    "The clients will be here tomorrow. Rest is part of the work.",
    "Late night grind noted. Make it count.",
    "Don't let late nights become the default — you're the one holding it all together.",
    "The hustle is real. So is burnout. Balance it.",
    "Make a note, close the tab, get some rest.",
  ],
  morning: [
    "What's the one client move that matters most today?",
    "Check your pipeline — who needs a follow-up this week?",
    "Any proposals still waiting on a response?",
    "Midweek pulse: how are your active clients tracking?",
    "What needs to close before Friday?",
    "End of week — which client relationships need attention?",
    "Weekend work? Keep it to one clear goal.",
  ],
  afternoon: [
    "Good time to chase any pending client responses.",
    "Halfway through — are your clients getting what they need?",
    "Any deals stalled? Now's the time to nudge them.",
    "Check in on active clients before end of day.",
    "Any proposals or decks that need a final push?",
    "Friday wrap — close out any open client threads.",
    "Weekend check-in: anything outstanding with clients?",
  ],
  evening: [
    "Evenings are good for reviewing what moved today.",
    "Quieter now — good time to prep for tomorrow's client calls.",
    "What client work can you clear tonight?",
    "Review your pipeline before you close up.",
    "Any follow-ups to send before tomorrow morning?",
    "Friday evening — solid week? What's open going into the weekend?",
    "Late session: what's the one thing worth finishing tonight?",
  ],
}

function getSlot(hour) {
  if (hour >= 0 && hour < 5) return 'lateNight'
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'lateNight'
}

export function useWelcomeGreeting() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  return useMemo(() => {
    const hour = time.getHours()
    const dayIndex = getDay(time)
    const slot = getSlot(hour)
    const greetings = GREETINGS[slot]
    const msgs = MESSAGES[slot]
    const template = greetings[dayIndex % greetings.length]
    return {
      greeting: template.replace('{name}', NAME),
      message: msgs[dayIndex % msgs.length],
    }
  }, [time])
}
