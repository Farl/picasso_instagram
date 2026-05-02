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
          <label className="field-label">GitHub Personal Access Token</label>
          <input
            className="input"
            type="password"
            placeholder="github_pat_... or ghp_..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="field-hint">
            Used to call <code>GitHub Models</code> (free, no credit card).<br />
            Get one at{' '}
            <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">
              github.com/settings/tokens
            </a>
            {' '}— only <strong>read-only</strong> scope needed.<br />
            Stored only in this browser, sent only to <code>models.inference.ai.azure.com</code>.
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
