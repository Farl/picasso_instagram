export default function Tabs({ value, onChange }) {
  return (
    <div className="tabs">
      <button
        className={`tab-btn ${value === 'feed' ? 'active' : ''}`}
        onClick={() => onChange('feed')}
      >
        For you
      </button>
      <button
        className={`tab-btn ${value === 'liked' ? 'active' : ''}`}
        onClick={() => onChange('liked')}
      >
        Liked
      </button>
    </div>
  );
}
