// src/components/widgets/DiscoveryWidget.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const DiscoveryWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPercentage, setShowPercentage] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);

  // Define all possible sources
  const allSources = [
    'Friends and Family',
    'Google',
    'Facebook',
    'Instagram',
    'Other'
  ];

  // Color mapping for different discovery channels
  const channelColors = {
    'Friends and Family': '#FF6B6B', // Warm red for personal connections
    'Google': '#4285F4', // Google blue
    'Facebook': '#1877F2', // Facebook blue
    'Instagram': '#E4405F', // Instagram pink/red
    'Other': '#808080', // Grey for other sources
  };

  // Get color for a specific source
  const getSourceColor = (source) => {
    return channelColors[source] || channelColors['Other'];
  };

  const getTimeRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let currentStart, currentEnd;
    
    switch (timeRange) {
      case '1day':
        currentStart = today;
        currentEnd = now;
        break;
      case '1week':
        currentStart = new Date(today);
        currentStart.setDate(currentStart.getDate() - 7);
        currentEnd = now;
        break;
      case '1month':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 1);
        currentEnd = now;
        break;
      case '3months':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 3);
        currentEnd = now;
        break;
      case 'custom':
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
        break;
      default:
        currentStart = today;
        currentEnd = now;
    }
    
    return { currentStart, currentEnd };
  };

  const fetchDiscoveries = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();

      let query = supabase
        .from('appointments')
        .select(`
          patient_id,
          patients!inner(how_did_you_get_to_know_us)
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', currentStart.toISOString())
        .lte('appointment_time', currentEnd.toISOString());

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Initialize counts for all sources
      const discoveryCounts = allSources.reduce((acc, source) => {
        acc[source] = 0;
        return acc;
      }, {});

      // Count occurrences of each discovery source
      data.forEach(item => {
        let source = item.patients.how_did_you_get_to_know_us;
        // Map the source to one of our predefined sources or 'Other'
        if (!allSources.includes(source)) {
          source = 'Other';
        }
        discoveryCounts[source]++;
      });

      // Convert to array and include all sources
      const sortedDiscoveries = allSources.map(source => ({
        source,
        count: discoveryCounts[source],
        percentage: (discoveryCounts[source] / (data.length || 1)) * 100
      })).sort((a, b) => b.count - a.count);

      setDiscoveries(sortedDiscoveries);
      setTotalVisits(data.length);

    } catch (error) {
      console.error('Error fetching discoveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchDiscoveries();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  const getMaxValue = () => {
    if (discoveries.length === 0) return 0;
    return showPercentage 
      ? Math.max(...discoveries.map(disc => disc.percentage))
      : Math.max(...discoveries.map(disc => disc.count));
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0',
      display: 'inline-block',
      minWidth: '300px',
      maxWidth: '400px',
      height: 'fit-content'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          margin: 0,
          color: '#666',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Discovery Sources
        </h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px'
        }}>
          <span style={{ fontSize: '12px', color: '#666' }}>Count</span>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '32px',
            height: '18px',
          }}>
            <input
              type="checkbox"
              checked={showPercentage}
              onChange={() => setShowPercentage(!showPercentage)}
              style={{
                opacity: 0,
                width: 0,
                height: 0,
              }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: showPercentage ? '#007bff' : '#ccc',
              transition: '0.4s',
              borderRadius: '34px',
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '14px',
                width: '14px',
                left: showPercentage ? '16px' : '2px',
                bottom: '2px',
                backgroundColor: 'white',
                transition: '0.4s',
                borderRadius: '50%',
              }}/>
            </span>
          </label>
          <span style={{ fontSize: '12px', color: '#666' }}>%</span>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ marginBottom: '15px' }}>
          {discoveries.map((discovery, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '5px'
              }}>
                <span style={{ fontSize: '14px' }}>{discovery.source}</span>
                <span style={{ fontSize: '14px' }}>
                  {showPercentage 
                    ? `${discovery.percentage.toFixed(1)}%`
                    : discovery.count
                  }
                </span>
              </div>
              <div style={{
                width: '100%',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                height: '8px'
              }}>
                <div style={{
                  width: `${(showPercentage ? discovery.percentage : discovery.count) / getMaxValue() * 100}%`,
                  backgroundColor: getSourceColor(discovery.source),
                  height: '100%',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoveryWidget;