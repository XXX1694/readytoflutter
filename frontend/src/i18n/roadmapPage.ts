import type { Lang } from './LangContext';


// Copy for /roadmap. Lives beside the page (not in ui.ts) so the strings ship
// with the page chunk rather than the entry.
const en = {
  metaTitle: (track: string) => `${track} roadmap — Onsite`,
  // Cross-Platform and Mobile have no ladder of their own, so the tab must not
  // claim another stack's.
  metaTitleNoTrack: 'Roadmap — Onsite',
  noTrackTitle: 'No level ladder for this stack',
  noTrackAction: 'Pick a track',
  noTrackBody: (stack: string) =>
    `The ladder runs per stack: Flutter, iOS and Android each have their own sixteen levels. ${stack} questions sit inside those tracks — or open every topic in the catalogue.`,

};

const ru: typeof en = {
  metaTitle: (track) => `Маршрут ${track} — Onsite`,
  metaTitleNoTrack: 'Маршрут — Onsite',
  noTrackTitle: 'У этого стека нет лестницы уровней',
  noTrackAction: 'Выбери маршрут',
  noTrackBody: (stack) =>
    `Лестница своя у каждого стека: у Flutter, iOS и Android по шестнадцать уровней. Вопросы стека «${stack}» входят в эти маршруты — или открой все темы в каталоге.`,

};

export type RoadmapCopy = typeof en;

export const useRoadmapCopy = (lang: Lang): RoadmapCopy => (lang === 'ru' ? ru : en);
