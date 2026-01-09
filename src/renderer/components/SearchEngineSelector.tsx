import React from 'react';
import { getAvailableEngines, SearchEngineType } from '../../core/searchEngineManager';

export interface SearchEngineSelectorProps {
    currentEngine: SearchEngineType;
    onEngineChange: (engine: SearchEngineType) => void;
}

const SearchEngineSelector: React.FC<SearchEngineSelectorProps> = ({
    currentEngine,
    onEngineChange,
}) => {
    const engines = getAvailableEngines();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onEngineChange(e.target.value as SearchEngineType);
    };

    return (
        <div className="search-engine-selector">
            <label htmlFor="search-engine-select">Search Engine:</label>
            <select
                id="search-engine-select"
                className="search-engine-select"
                value={currentEngine}
                onChange={handleChange}
            >
                {engines.map(engine => (
                    <option key={engine.type} value={engine.type}>
                        {engine.name}
                    </option>
                ))}
            </select>
            <p className="search-engine-description">
                Choose your preferred search engine for queries in the address bar.
            </p>
        </div>
    );
};

export default SearchEngineSelector;
