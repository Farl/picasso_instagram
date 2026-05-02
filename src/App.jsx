import { useState, useEffect } from 'react';
import TopBar from './components/TopBar.jsx';
import Feed from './components/Feed.jsx';
import GeneratorPanel from './components/GeneratorPanel.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { getLocalUser } from './lib/store.js';
import { getApiKey } from './lib/api.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getLocalUser);
  const [showCreator, setShowCreator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHint, setShowHint] = useState(!getApiKey());

  // Prompt for settings on first visit (no API key set)
  useEffect(() => {
    if (!getApiKey()) setShowSettings(true);
  }, []);

  function handleUserChange(user) {
    setCurrentUser(user);
  }

  function handleNeedApiKey() {
    setShowCreator(false);
    setShowSettings(true);
  }

  return (
    <div className="app-root">
      <TopBar onSettingsClick={() => setShowSettings(true)} />

      <Feed currentUser={currentUser} />

      {/* FAB */}
      <button className="fab" onClick={() => setShowCreator(true)}>+</button>

      {/* Hint for new users */}
      {showHint && !showCreator && !showSettings && (
        <button className="fab-hint" onClick={() => { setShowHint(false); setShowSettings(true); }}>
          ⚙️ Set your OpenAI key to start
        </button>
      )}

      {/* Creator bottom sheet */}
      {showCreator && (
        <div className="sheet-backdrop" onClick={() => setShowCreator(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <GeneratorPanel
              onCreated={() => setShowCreator(false)}
              onClose={() => setShowCreator(false)}
              onNeedApiKey={handleNeedApiKey}
            />
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => { setShowSettings(false); setShowHint(false); }}
          onUserChange={handleUserChange}
        />
      )}
    </div>
  );
}
