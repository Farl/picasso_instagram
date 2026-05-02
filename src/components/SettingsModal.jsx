import { useState } from 'react';
import { saveApiKey, getApiKey } from '../lib/api.js';
import { getLocalUser, setLocalUsername } from '../lib/store.js';

export default function SettingsModal({ onClose, onUserChange }) {
  const [apiKey, setApiKey] = useState(getApiKey);
  const [username, setUsername] = useState(() => getLocalUser().username);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveApiKey(apiKey);
    const user = setLocalUsername(username);
    onUserChange?.(user);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="panel-title">Settings</span>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="field-row">
          <label className="field-label">Display name</label>
          <input
            className="input"
            placeholder="your_username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="field-row">
          <label className="field-label">OpenAI API Key</label>
          <input
            className="input"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="field-hint">
            Your key is stored only in this browser (localStorage) and sent directly to{' '}
            <code>api.openai.com</code>. Never shared with anyone else.
          </p>
        </div>

        <div className="generator-actions">
          <button className="btn primary" onClick={handleSave}>
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
