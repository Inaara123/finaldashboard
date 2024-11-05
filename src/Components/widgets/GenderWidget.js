// src/components/widgets/GenderWidget.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const GenderWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [genders, setGenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPercentage, setShowPercentage] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);

  // Define all possible genders
  const allGenders = [
    'Male',
    'Female'
  ];

  // Color mapping for different genders
  const genderColors = {
    'Male': '#4285F4',    // Blue
    'Female': '#FF69B4',  // Pink
  };

  // SVG icons for genders
  const genderIcons = {
    Male: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M10.5,7H13.5C14.6,7 15.5,7.9 15.5,9V14.5H14V22H10V14.5H8.5V9C8.5,7.9 9.4,7 10.5,7Z" />
      </svg>
    ),
    Female: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M10.5,22V16H7.5L10.09,8.41C10.34,7.59 11.1,7 12,7C12.9,7 13.66,7.59 13.91,8.41L16.5,16H13.5V22H10.5Z" />
      </svg>
    )
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

  const fetchGenders = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();

      let query = supabase
        .from('appointments')
        .select(`
          patient_id,
          patients!inner(gender)
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', currentStart.toISOString())
        .lte('appointment_time', currentEnd.toISOString())
        .in('patients.gender', allGenders); // Only fetch Male and Female

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Initialize counts for all genders
      const genderCounts = allGenders.reduce((acc, gender) => {
        acc[gender] = 0;
        return acc;
      }, {});

      // Count occurrences of each gender
      data.forEach(item => {
        const gender = item.patients.gender;
        if (allGenders.includes(gender)) {
          genderCounts[gender]++;
        }
      });

      // Convert to array and include all genders
      const sortedGenders = allGenders.map(gender => ({
        source: gender,
        count: genderCounts[gender],
        percentage: (genderCounts[gender] / (data.length || 1)) * 100
      })).sort((a, b) => b.count - a.count);

      setGenders(sortedGenders);
      setTotalVisits(data.length);

    } catch (error) {
      console.error('Error fetching genders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchGenders();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

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
      height: 'fit-content',
      marginTop: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{ 
          margin: 0,
          color: '#666',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          Gender Distribution
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '20px 0'
        }}>
          {genders.map((gender, index) => (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                color: genderColors[gender.source],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: `${genderColors[gender.source]}15`
              }}>
                {genderIcons[gender.source]}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>
                {gender.source}
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: genderColors[gender.source]
              }}>
                {showPercentage 
                  ? `${gender.percentage.toFixed(1)}%`
                  : gender.count
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenderWidget;