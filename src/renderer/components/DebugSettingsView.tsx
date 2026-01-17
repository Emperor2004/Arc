import React from 'react';

const DebugSettingsView: React.FC = () => {
  const [debugInfo, setDebugInfo] = React.useState<any>({});

  React.useEffect(() => {
    const checkAPI = async () => {
      const info: any = {
        windowArcExists: !!window.arc,
        getSettingsExists: !!(window.arc && window.arc.getSettings),
        timestamp: new Date().toISOString()
      };

      if (window.arc && window.arc.getSettings) {
        try {
          const settings = await window.arc.getSettings();
          info.settings = settings;
          info.settingsLoaded = true;
        } catch (error) {
          info.settingsError = error.message;
          info.settingsLoaded = false;
        }
      }

      setDebugInfo(info);
    };

    checkAPI();
  }, []);

  return (
    <div style={{ padding: '20px', color: 'white', background: '#1a1a1a', minHeight: '100vh' }}>
      <h1>Settings Debug View</h1>
      <pre style={{ background: '#333', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      
      <div style={{ marginTop: '20px' }}>
        <h2>API Test</h2>
        <button 
          onClick={async () => {
            if (window.arc && window.arc.getSettings) {
              try {
                const settings = await window.arc.getSettings();
                alert('Settings loaded: ' + JSON.stringify(settings, null, 2));
              } catch (error) {
                alert('Error: ' + error.message);
              }
            } else {
              alert('window.arc.getSettings not available');
            }
          }}
          style={{ padding: '10px', margin: '5px' }}
        >
          Test getSettings
        </button>
        
        <button 
          onClick={async () => {
            if (window.arc && window.arc.getJarvisRecommendations) {
              try {
                const recs = await window.arc.getJarvisRecommendations();
                alert('Recommendations loaded: ' + JSON.stringify(recs, null, 2));
              } catch (error) {
                alert('Error: ' + error.message);
              }
            } else {
              alert('window.arc.getJarvisRecommendations not available');
            }
          }}
          style={{ padding: '10px', margin: '5px' }}
        >
          Test Jarvis Recommendations
        </button>
      </div>
    </div>
  );
};

export default DebugSettingsView;
