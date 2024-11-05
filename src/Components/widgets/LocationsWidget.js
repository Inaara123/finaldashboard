// src/components/widgets/LocationsWidget.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FaTimes } from 'react-icons/fa';

const LocationsWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPercentage, setShowPercentage] = useState(false);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);

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

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();

      let query = supabase
        .from('appointments')
        .select(`
          patient_id,
          patients!inner(address)
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', currentStart.toISOString())
        .lte('appointment_time', currentEnd.toISOString());

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Count occurrences of each location
      const locationCounts = data.reduce((acc, curr) => {
        const location = curr.patients.address.split(',')[0].trim(); // Get first part of address
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      // Convert to array and sort
      const sortedLocations = Object.entries(locationCounts)
        .map(([address, count]) => ({
          address,
          count,
          percentage: (count / data.length) * 100
        }))
        .sort((a, b) => b.count - a.count);

      setLocations(sortedLocations);
      setTotalVisits(data.length);

    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchLocations();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  const getMaxValue = () => {
    if (locations.length === 0) return 0;
    return showPercentage 
      ? Math.max(...locations.map(loc => loc.percentage))
      : Math.max(...locations.map(loc => loc.count));
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
          Top Locations
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
        <>
          <div style={{ marginBottom: '15px' }}>
            {locations.slice(0, 5).map((location, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '5px'
                }}>
                  <span style={{ fontSize: '14px' }}>{location.address}</span>
                  <span style={{ fontSize: '14px' }}>
                    {showPercentage 
                      ? `${location.percentage.toFixed(1)}%`
                      : location.count
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
                    width: `${(showPercentage ? location.percentage : location.count) / getMaxValue() * 100}%`,
                    backgroundColor: '#007bff',
                    height: '100%',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}/>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowAllLocations(true)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Show All Locations
          </button>
        </>
      )}

      {showAllLocations && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          maxHeight: '80vh',
          width: '90%',
          maxWidth: '600px',
          zIndex: 1000
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: 0 }}>All Locations</h3>
            <button
              onClick={() => setShowAllLocations(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              <FaTimes />
            </button>
          </div>
          <div style={{
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 100px)'
          }}>
            {locations.map((location, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #eee'
              }}>
                <span>{location.address}</span>
                <span>
                  {showPercentage 
                    ? `${location.percentage.toFixed(1)}%`
                    : location.count
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAllLocations && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999
        }} onClick={() => setShowAllLocations(false)} />
      )}
    </div>
  );
};

export default LocationsWidget;