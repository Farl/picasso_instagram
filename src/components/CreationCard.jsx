import { normalizeSvg } from '../lib/api.js';

const AVATAR_BASE = 'https://api.dicebear.com/9.x/initials/svg?seed=';

export default function CreationCard({ creation, likeCount, isLiked, onToggleLike, currentUser }) {
  const isMine = currentUser && creation.username === currentUser.username;

  return (
    <div className="card">
      <div className="card-header">
        <div className="avatar-badge">
          <img
            src={`${AVATAR_BASE}${encodeURIComponent(creation.username || 'anon')}`}
            alt={creation.username}
          />
        </div>
        <div className="card-header-text">
          <div className="card-title">{creation.title || 'Untitled'}</div>
          <div className="card-subtitle">
            {isMine ? 'You' : creation.username || 'Anonymous'}
          </div>
        </div>
        <button
          className={`like-btn ${isLiked ? 'liked' : ''}`}
          onClick={onToggleLike}
        >
          {isLiked ? '★' : '☆'}
          <span className="like-count">{likeCount || ''}</span>
        </button>
      </div>

      <div className="card-svg">
        <div
          className="card-svg-inner"
          dangerouslySetInnerHTML={{ __html: normalizeSvg(creation.svg) }}
        />
      </div>

      {(creation.tags || creation.prompt) && (
        <div className="card-footer">
          {creation.tags && (
            <div className="tags">
              {creation.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="tag-chip">#{tag}</span>
              ))}
            </div>
          )}
          {creation.prompt && (
            <div className="prompt-text">{creation.prompt}</div>
          )}
        </div>
      )}
    </div>
  );
}
