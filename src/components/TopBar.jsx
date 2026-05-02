export default function TopBar({ onSettingsClick }) {
  return (
    <header className="top-bar">
      <div className="top-title">Picasso Instagram</div>
      <div className="top-actions">
        <button className="top-icon-btn" onClick={onSettingsClick} title="Settings">
          ⚙️
        </button>
      </div>
    </header>
  );
}
