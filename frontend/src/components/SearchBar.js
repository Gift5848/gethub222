import React from 'react';

const makes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes'];
const models = {
  Toyota: ['Corolla', 'Camry', 'RAV4'],
  Honda: ['Civic', 'Accord', 'CR-V'],
  Ford: ['Focus', 'Fusion', 'Escape'],
  BMW: ['3 Series', '5 Series', 'X5'],
  Mercedes: ['C-Class', 'E-Class', 'GLA']
};
const years = Array.from({ length: 25 }, (_, i) => 2025 - i);

function SearchBar({ filters, setFilters, onSearch }) {
  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleModelChange = (e) => {
    setFilters({ ...filters, model: e.target.value });
  };

  return (
    <div className="search-bar">
      <select name="make" value={filters.make} onChange={handleChange}>
        <option value="">All Makes</option>
        {makes.map(make => (
          <option key={make} value={make}>{make}</option>
        ))}
      </select>
      <select name="model" value={filters.model} onChange={handleModelChange} disabled={!filters.make}>
        <option value="">All Models</option>
        {filters.make && models[filters.make].map(model => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
      <select name="year" value={filters.year} onChange={handleChange}>
        <option value="">All Years</option>
        {years.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      <input
        type="text"
        name="search"
        placeholder="Search parts..."
        value={filters.search}
        onChange={handleChange}
      />
      <button onClick={onSearch}>Search</button>
    </div>
  );
}

export default SearchBar;
