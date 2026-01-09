import React, { useState } from 'react';
import '../styles/dataExportImport.css';

export interface DataExportImportProps {
  onMessage: (message: string) => void;
}

const DataExportImport: React.FC<DataExportImportProps> = ({ onMessage }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (window.arc && window.arc.exportData) {
        const result = await window.arc.exportData();
        if (result.ok && result.data) {
          // Validate export data structure
          if (!result.data.version || !result.data.timestamp) {
            throw new Error('Invalid export data structure');
          }

          // Create blob and download
          const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `arc-browser-export-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          const itemCount = (result.data.history?.length || 0) + 
                           (result.data.feedback?.length || 0) + 
                           (result.data.bookmarks?.length || 0);
          onMessage(`Data exported successfully! (${itemCount} items)`);
        } else {
          onMessage('Failed to export data: ' + (result.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      onMessage('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          onMessage('File is too large (max 10MB)');
          return;
        }

        setIsImporting(true);
        try {
          const text = await file.text();
          let data;
          
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            throw new Error('Invalid JSON format in file');
          }

          // Validate data structure
          if (!data || typeof data !== 'object') {
            throw new Error('Invalid export file format');
          }

          if (!data.version || !data.timestamp) {
            throw new Error('Missing required fields in export file');
          }

          // Check version compatibility
          const exportVersion = data.version.split('.')[0];
          const currentVersion = '1';
          if (exportVersion !== currentVersion) {
            throw new Error(`Incompatible export version: ${data.version}`);
          }

          if (importMode === 'replace') {
            if (!window.confirm('This will replace all your current data. Are you sure?')) {
              return;
            }
          }

          if (window.arc && window.arc.importData) {
            const result = await window.arc.importData(data, importMode);
            if (result.ok) {
              const itemCount = (data.history?.length || 0) + 
                               (data.feedback?.length || 0) + 
                               (data.bookmarks?.length || 0);
              onMessage(`Data imported successfully in ${importMode} mode! (${itemCount} items)`);
            } else {
              throw new Error(result.error || 'Import failed');
            }
          }
        } catch (error) {
          console.error('Import failed:', error);
          onMessage('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
          setIsImporting(false);
        }
      };
      input.click();
    } catch (error) {
      console.error('Import dialog failed:', error);
      onMessage('Failed to open import dialog');
    }
  };

  return (
    <div className="data-export-import">
      <div className="export-section">
        <div className="export-content">
          <span>Export all your data</span>
          <span className="export-description">
            Download a backup of your history, bookmarks, and settings
          </span>
        </div>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Data'}
        </button>
      </div>

      <div className="import-section">
        <div className="import-content">
          <span>Import data</span>
          <span className="import-description">
            Restore data from a previous export
          </span>
          <div className="import-mode">
            <label className="mode-label">
              <input
                type="radio"
                name="importMode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              />
              <span>Merge with existing data</span>
            </label>
            <label className="mode-label">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
              />
              <span>Replace all data</span>
            </label>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={handleImport}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import Data'}
        </button>
      </div>
    </div>
  );
};

export default DataExportImport;
