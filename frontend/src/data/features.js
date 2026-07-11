// Central list of Quorum's interactive feature types.
// Used by the Navbar (top-level links) and the feature landing pages.
// `ready: true` means the feature is live today; others are on the roadmap
// and render a polished "Coming soon" page until their sprint lands.

const features = [
  {
    key: 'quiz',
    name: 'Quiz',
    path: '/quizzes',
    icon: '🎯',
    tagline: 'Competitive, scored, and timed.',
    description:
      'Run a live multiple-choice quiz. Players answer against the clock, points scale with speed, and a leaderboard reveals the winner.',
    ready: true,
  },
  {
    key: 'poll',
    name: 'Poll',
    path: '/features/poll',
    icon: '📊',
    tagline: 'Ask the room, see it live.',
    description:
      'Gather instant opinions with no right or wrong answer. Votes animate into live bar or pie charts as they come in.',
    ready: true,
  },
  {
    key: 'word-cloud',
    name: 'Word Cloud',
    path: '/features/word-cloud',
    icon: '☁️',
    tagline: 'Watch consensus take shape.',
    description:
      'Participants submit short words or phrases. Popular answers grow larger in a word cloud that updates in real time.',
    ready: true,
  },
  {
    key: 'survey',
    name: 'Survey',
    path: '/features/survey',
    icon: '📝',
    tagline: 'Honest, anonymous feedback.',
    description:
      'Collect open text or rating-scale feedback. Responses stream in as a live feed or a rating distribution.',
    ready: true,
  },
  {
    key: 'qna',
    name: 'Q&A',
    path: '/features/qna',
    icon: '💬',
    tagline: 'Let the best questions rise.',
    description:
      'The audience submits questions and upvotes the ones they care about. The host sees them sorted by votes, live.',
    ready: true,
  },
  {
    key: 'presentations',
    name: 'Presentations',
    path: '/features/presentations',
    icon: '🖥️',
    tagline: 'One deck, every screen in sync.',
    description:
      'Combine quizzes, polls, and word clouds into a single presentation. Advance a slide and every participant follows along.',
    ready: true,
  },
];

export default features;
