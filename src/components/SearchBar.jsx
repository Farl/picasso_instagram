export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <input
        className="input search-input"
        placeholder="Search by text or tags…"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
