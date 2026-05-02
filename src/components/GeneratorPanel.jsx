import { useState } from 'react';
import { generateSvgFromPrompt, normalizeSvg } from '../lib/api.js';
import { room } from '../lib/store.js';

async function createCreationRecord({ prompt, title, tags, svg }) {
  const text_index = [title, prompt, tags].filter(Boolean).join(' ').toLowerCase();
  return room.collection('creation_v1').create({ prompt, title, tags, svg, text_index });
}

export default function GeneratorPanel({ onCreated, onClose, onNeedApiKey }) {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = prompt.trim().length > 3 && !loading;

  async function handleGenerate() {
    setError('');
    setLoading(true);
    try {
      const result = await generateSvgFromPrompt(prompt.trim());
      setSvg(result);
    } catch (e) {
      if (e.message === 'MISSING_API_KEY') {
        onNeedApiKey?.();
      } else {
        setError(e.message || 'SVG generation failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!svg) return;
    setError('');
    setLoading(true);
    try {
      const record = await createCreationRecord({
        prompt: prompt.trim(),
        title: title.trim() || prompt.trim().slice(0, 60),
        tags: tags.trim(),
        svg,
      });
      onCreated?.(record);
      setPrompt('');
      setTitle('');
      setTags('');
      setSvg('');
    } catch (e) {
      setError('Saving failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel generator-panel">
      <div className="sheet-header">
        <span className="panel-title">Create</span>
        {onClose && (
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        )}
      </div>
      {loading && <div className="panel-status" style={{ marginBottom: 4 }}>Working…</div>}

      <div className="field-row">
        <textarea
          className="input prompt-input"
          placeholder="Describe the SVG you want…"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>
      <div className="field-row compact">
        <input
          className="input"
          placeholder="Title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>
      <div className="field-row compact">
        <input
          className="input"
          placeholder="Tags, comma separated (e.g. abstract, circle, green)"
          value={tags}
          onChange={e => setTags(e.target.value)}
        />
      </div>

      <div className="generator-actions">
        <button className="btn primary" onClick={handleGenerate} disabled={!canGenerate}>
          {loading ? 'Generating…' : 'Generate SVG'}
        </button>
        <button className="btn secondary" onClick={handleSave} disabled={!svg || loading}>
          Save to feed
        </button>
      </div>

      {error && <div className="error-text">{error}</div>}

      {svg && (
        <div className="svg-preview">
          <div
            className="svg-inner"
            dangerouslySetInnerHTML={{ __html: normalizeSvg(svg) }}
          />
        </div>
      )}
    </div>
  );
}
