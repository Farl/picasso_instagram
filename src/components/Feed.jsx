import { useState, useSyncExternalStore, useMemo } from 'react';
import { room } from '../lib/store.js';
import { rankCreations } from '../lib/ranking.js';
import CreationCard from './CreationCard.jsx';
import SearchBar from './SearchBar.jsx';
import Tabs from './Tabs.jsx';

async function toggleLike({ creationId, currentUser, likes }) {
  if (!currentUser) return;
  const col = room.collection('like_v1');
  const myLikes = likes.filter(
    l => l.creation_id === creationId && l.username === currentUser.username
  );
  if (myLikes.length > 0) {
    await Promise.all(myLikes.map(l => col.delete(l.id)));
  } else {
    await col.create({ creation_id: creationId });
  }
}

export default function Feed({ currentUser }) {
  const [tab, setTab] = useState('feed');
  const [search, setSearch] = useState('');

  const creations = useSyncExternalStore(
    room.collection('creation_v1').subscribe,
    room.collection('creation_v1').getList
  );
  const likes = useSyncExternalStore(
    room.collection('like_v1').subscribe,
    room.collection('like_v1').getList
  );

  const { ranked, likeCountById, likedIdSet } = useMemo(() => {
    const scored = rankCreations({ creations, likes, currentUser, searchQuery: search });
    const ranked = scored.map(x => x.creation);
    const likeCountById = new Map(scored.map(x => [x.creation.id, x.likeCount]));
    const likedIdSet = new Set(
      likes
        .filter(l => currentUser && l.username === currentUser.username)
        .map(l => l.creation_id)
    );
    return { ranked, likeCountById, likedIdSet };
  }, [creations, likes, currentUser, search]);

  const visible = tab === 'feed' ? ranked : ranked.filter(c => likedIdSet.has(c.id));

  return (
    <div className="panel feed-panel">
      <div className="panel-header-row">
        <span className="panel-title">Explore</span>
      </div>
      <SearchBar value={search} onChange={setSearch} />
      <Tabs value={tab} onChange={setTab} />
      <div className="feed-list">
        {visible.length === 0 && (
          <div className="empty-state">
            {search
              ? 'No creations match your search yet.'
              : tab === 'liked'
                ? 'You have not liked any creations yet.'
                : 'New creations will appear here.'}
          </div>
        )}
        {visible.map(c => (
          <CreationCard
            key={c.id}
            creation={c}
            likeCount={likeCountById.get(c.id) || 0}
            isLiked={likedIdSet.has(c.id)}
            onToggleLike={() => toggleLike({ creationId: c.id, currentUser, likes })}
            currentUser={currentUser}
          />
        ))}
      </div>
    </div>
  );
}
