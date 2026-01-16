/**
 * VESPA Questionnaire Questions (Lite)
 *
 * Ported from `Apps/VESPAQuestionnaireV2/src/data/questions.js`.
 * Note: Knack field mappings are intentionally omitted for Lite.
 */

export type VespaCategory = 'VISION' | 'EFFORT' | 'SYSTEMS' | 'PRACTICE' | 'ATTITUDE' | 'OUTCOME'

export type LikertValue = 1 | 2 | 3 | 4 | 5

export type Question = {
  id: string
  text: string
  explainer?: string
  category: VespaCategory
  order: number
}

export const questions: Question[] = [
  {
    id: 'q1',
    text: "I've worked out the next steps in my life",
    explainer: 'This is about whether you have a clear next action for your studies.',
    category: 'VISION',
    order: 1,
  },
  {
    id: 'q2',
    text: 'I plan and organise my time so that I can fit in all my school work as well as other activities',
    explainer: 'This is about how regularly you use a plan or system to manage work and deadlines.',
    category: 'SYSTEMS',
    order: 2,
  },
  {
    id: 'q3',
    text: 'I give a lot of attention to my career planning',
    explainer: 'This is about how much time and thought you give to exploring and planning future paths.',
    category: 'VISION',
    order: 3,
  },
  { id: 'q4', text: 'I complete all my homework on time', explainer: 'This is about how consistently you meet task deadlines.', category: 'SYSTEMS', order: 4 },
  {
    id: 'q5',
    text: 'No matter who you are, you can change your intelligence a lot',
    explainer: 'This is about your view of intelligence—whether you see it as changeable or mostly fixed.',
    category: 'ATTITUDE',
    order: 5,
  },
  {
    id: 'q6',
    text: 'I use all my independent study time effectively',
    explainer: 'This is about how focused and productive your study time usually is.',
    category: 'EFFORT',
    order: 6,
  },
  {
    id: 'q7',
    text: 'I test myself on important topics until I remember them',
    explainer: 'This is about how often you use self-testing (e.g., recall, quizzes, past questions).',
    category: 'PRACTICE',
    order: 7,
  },
  { id: 'q8', text: 'I have a positive view of myself', explainer: 'This is about how you generally see yourself day to day.', category: 'ATTITUDE', order: 8 },
  { id: 'q9', text: 'I am a hard working student', explainer: 'This is about how much consistent effort you feel you put into your studies.', category: 'EFFORT', order: 9 },
  {
    id: 'q10',
    text: 'I am confident in my academic ability',
    explainer: 'This is about how confident you feel right now about learning and performing.',
    category: 'ATTITUDE',
    order: 10,
  },
  { id: 'q11', text: 'I always meet deadlines', explainer: 'This is about your typical track record with due dates.', category: 'SYSTEMS', order: 11 },
  {
    id: 'q12',
    text: 'I spread out my revision, rather than cramming at the last minute',
    explainer: 'This is about how often you space your study over time instead of leaving it late.',
    category: 'PRACTICE',
    order: 12,
  },
  {
    id: 'q13',
    text: "I don't let a poor test/assessment result get me down for too long",
    explainer: 'This is about how quickly you recover and refocus after setbacks.',
    category: 'ATTITUDE',
    order: 13,
  },
  {
    id: 'q14',
    text: 'I strive to achieve the goals I set for myself',
    explainer: 'This is about how actively you work toward your own goals.',
    category: 'VISION',
    order: 14,
  },
  {
    id: 'q15',
    text: 'I summarise important information in diagrams, tables or lists',
    explainer: 'This is about how often you create concise summaries or visuals from your notes.',
    category: 'PRACTICE',
    order: 15,
  },
  { id: 'q16', text: 'I enjoy learning new things', explainer: 'This is about how much you generally enjoy picking up new knowledge or skills.', category: 'VISION', order: 16 },
  { id: 'q17', text: "I'm not happy unless my work is the best it can be", explainer: 'This is about how much you push to refine and improve your work.', category: 'EFFORT', order: 17 },
  { id: 'q18', text: 'I take good notes in class which are useful for revision', explainer: 'This is about how useful and clear your notes usually are when you revisit them.', category: 'SYSTEMS', order: 18 },
  { id: 'q19', text: 'When revising I mix different kinds of topics/subjects in one study session', explainer: 'This is about how often you interleave different topics rather than doing one only.', category: 'PRACTICE', order: 19 },
  { id: 'q20', text: 'I feel I can cope with the pressure at school/college/University', explainer: 'This is about how manageable current study pressures feel with your existing approaches.', category: 'ATTITUDE', order: 20 },
  { id: 'q21', text: 'I work as hard as I can in most classes', explainer: 'This is about your typical effort level during lessons.', category: 'EFFORT', order: 21 },
  { id: 'q22', text: 'My books/files are organised', explainer: 'This is about how easy it is for you to find materials when you need them.', category: 'SYSTEMS', order: 22 },
  { id: 'q23', text: 'I study by explaining difficult topics out loud', explainer: 'This is about how often you explain content out loud (to others or yourself) when revising.', category: 'PRACTICE', order: 23 },
  { id: 'q24', text: "I'm happy to ask questions in front of a group", explainer: 'This is about how comfortable you feel asking public questions for clarification.', category: 'ATTITUDE', order: 24 },
  { id: 'q25', text: 'When revising, I work under timed conditions answering exam-style questions', explainer: 'This is about how often you use active revision techniques and timed practice.', category: 'PRACTICE', order: 25 },
  { id: 'q26', text: 'Your intelligence is something about you that you can change very much', explainer: 'This is about your belief about intelligence changing over time. Answer with your view.', category: 'ATTITUDE', order: 26 },
  { id: 'q27', text: 'I like hearing feedback about how I can improve', explainer: 'This is about how willing you are to receive and use specific feedback.', category: 'ATTITUDE', order: 27 },
  { id: 'q28', text: 'I can control my nerves in tests/practical assessments', explainer: 'This is about how well you feel you manage nerves during assessments.', category: 'ATTITUDE', order: 28 },
  { id: 'q29', text: 'I know what grades I want to achieve', explainer: 'This is about whether you have clear target grades in mind.', category: 'VISION', order: 29 },
  // Outcome questions (collected, do not affect VESPA scores)
  { id: 'q30', text: 'I have the support I need to achieve this year', explainer: 'This is about how adequate you feel your support network and resources are.', category: 'OUTCOME', order: 30 },
  { id: 'q31', text: 'I feel equipped to face the study and revision challenges this year', explainer: 'This is about how prepared you feel for the academic demands ahead.', category: 'OUTCOME', order: 31 },
  { id: 'q32', text: 'I am confident I will achieve my potential in my final exams', explainer: 'This is about your current confidence in reaching your potential outcomes.', category: 'OUTCOME', order: 32 },
]

export const categories: Record<
  Exclude<VespaCategory, 'OUTCOME'> | 'OUTCOME',
  { name: string; description: string; color: string; letter: string }
> = {
  VISION: { name: 'Vision', description: 'Your goals and future planning', color: '#ff8f00', letter: 'V' },
  EFFORT: { name: 'Effort', description: 'Your work ethic and perseverance', color: '#86b4f0', letter: 'E' },
  SYSTEMS: { name: 'Systems', description: 'Your organization and time management', color: '#72cb44', letter: 'S' },
  PRACTICE: { name: 'Practice', description: 'Your study techniques and methods', color: '#7f31a4', letter: 'P' },
  ATTITUDE: { name: 'Attitude', description: 'Your mindset and resilience', color: '#f032e6', letter: 'A' },
  OUTCOME: { name: 'Outcome', description: 'Your confidence and preparedness', color: '#2196f3', letter: 'O' },
}

export const likertScale: Array<{ value: LikertValue; label: string; shortLabel: string }> = [
  { value: 1, label: 'Strongly Disagree', shortLabel: 'Strongly\nDisagree' },
  { value: 2, label: 'Disagree', shortLabel: 'Disagree' },
  { value: 3, label: 'Neutral', shortLabel: 'Neutral' },
  { value: 4, label: 'Agree', shortLabel: 'Agree' },
  { value: 5, label: 'Strongly Agree', shortLabel: 'Strongly\nAgree' },
]

