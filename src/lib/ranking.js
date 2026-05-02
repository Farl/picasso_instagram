/** Ranking algorithm for the social feed. */

function scoreCreation({ creation, now, likeCount, userLikedIds, userLikedTags, currentUser }) {
  const createdTime = new Date(creation.created_at).getTime();
  const ageHours = (now - createdTime) / (1000 * 60 * 60);
  const recencyScore = Math.exp(-ageHours / 24);

  const engagementScore = Math.log1p(likeCount);

  const tags = (creation.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
  let tagOverlap = 0;
  for (const t of tags) {
    if (userLikedTags.has(t)) tagOverlap += 1;
  }
  const personalTagScore = Math.min(tagOverlap, 3);

  const creatorIsUser = currentUser && creation.username === currentUser.username;
  const selfPenalty = creatorIsUser ? 0.3 : 1.0;

  const score =
    1.3 * recencyScore +
    0.8 * personalTagScore +
    0.7 * engagementScore;

  return score * selfPenalty;
}

export function rankCreations({ creations, likes, currentUser, searchQuery }) {
  const now = Date.now();
  const query = (searchQuery || '').toLowerCase().trim();

  const likeCountByCreation = new Map();
  const userLikedIds = new Set();
  const userLikedTags = new Set();

  for (const like of likes) {
    const cid = like.creation_id;
    likeCountByCreation.set(cid, (likeCountByCreation.get(cid) || 0) + 1);
    if (currentUser && like.username === currentUser.username) {
      userLikedIds.add(cid);
    }
  }

  for (const creation of creations) {
    if (userLikedIds.has(creation.id)) {
      const tags = (creation.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
      for (const t of tags) userLikedTags.add(t);
    }
  }

  let filtered = creations.slice();

  if (query) {
    filtered = filtered.filter(c => {
      const text = [c.title, c.prompt, c.tags, c.text_index].filter(Boolean).join(' ').toLowerCase();
      return text.includes(query);
    });
  }

  const scored = filtered.map(c => ({
    creation: c,
    score: scoreCreation({ creation: c, now, likeCount: likeCountByCreation.get(c.id) || 0, userLikedIds, userLikedTags, currentUser }),
    likeCount: likeCountByCreation.get(c.id) || 0,
  }));

  scored.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : new Date(b.creation.created_at) - new Date(a.creation.created_at)
  );

  return scored;
}
