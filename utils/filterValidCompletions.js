export function getValidCompleteResponses(responses, moduleIds) {
  const sessionToModules = {};
  responses.forEach((r) => {
    if (!sessionToModules[r.user_session_id]) sessionToModules[r.user_session_id] = new Set();
    sessionToModules[r.user_session_id].add(r.module_id);
  });

  const validSessions = Object.entries(sessionToModules)
    .filter(([_, mods]) => mods.size === 1)
    .map(([sid]) => sid);

  const filteredResponses = responses.filter(r => validSessions.includes(r.user_session_id));

  const moduleCounts = {};
  filteredResponses.forEach(r => {
    if (!moduleCounts[r.module_id]) moduleCounts[r.module_id] = new Set();
    moduleCounts[r.module_id].add(r.user_session_id);
  });

  const minCount = Math.min(...Object.values(moduleCounts).map(set => set.size));
  const limitedSessions = new Set();

  Object.values(moduleCounts).forEach(set => {
    Array.from(set).slice(0, minCount).forEach(sid => limitedSessions.add(sid));
  });

  const finalResponses = filteredResponses.filter(
    r => limitedSessions.has(r.user_session_id) && r.gender && r.age
  );

  return finalResponses;
}

export function normalizeAge(age) {
  const val = age?.replace('--', '–').replace('-', '–').trim();
  return ['18–24', '25–34', '35–44', '45+'].includes(val) ? val : null;
}
