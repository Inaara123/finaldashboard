// src/components/widgets/VisitsWidget.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

const VisitsWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [visitsCount, setVisitsCount] = useState(0);
  const [comparison, setComparison] = useState({ percentage: 0, increased: false });
  const [loading, setLoading] = useState(true);

  const getTimeRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let currentStart, currentEnd, previousStart, previousEnd;
    
    switch (timeRange) {
      case '1day':
        currentStart = today;
        currentEnd = now;
        previousStart = new Date(today);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = today;
        break;
      case '1week':
        currentStart = new Date(today);
        currentStart.setDate(currentStart.getDate() - 7);
        currentEnd = now;
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = currentStart;
        break;
      case '1month':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 1);
        currentEnd = now;
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 1);
        previousEnd = currentStart;
        break;
      case '3months':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 3);
        currentEnd = now;
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 3);
        previousEnd = currentStart;
        break;
      case 'custom':
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
        const duration = currentEnd - currentStart;
        previousStart = new Date(currentStart - duration);
        previousEnd = currentStart;
        break;
      default:
        currentStart = today;
        currentEnd = now;
        previousStart = new Date(today);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = today;
    }
    
    return { currentStart, currentEnd, previousStart, previousEnd };
  };

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd, previousStart, previousEnd } = getTimeRanges();

      let query = supabase
        .from('appointments')
        .select('appointment_id', { count: 'exact' })
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', currentStart.toISOString())
        .lte('appointment_time', currentEnd.toISOString());

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { count: currentCount, error: currentError } = await query;

      if (currentError) throw currentError;

      let previousQuery = supabase
        .from('appointments')
        .select('appointment_id', { count: 'exact' })
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', previousStart.toISOString())
        .lte('appointment_time', previousEnd.toISOString());

      if (doctorId !== 'all') {
        previousQuery = previousQuery.eq('doctor_id', doctorId);
      }

      const { count: previousCount, error: previousError } = await previousQuery;

      if (previousError) throw previousError;

      setVisitsCount(currentCount || 0);

      if (previousCount > 0) {
        const percentageChange = ((currentCount - previousCount) / previousCount) * 100;
        setComparison({
          percentage: Math.abs(Math.round(percentageChange)),
          increased: percentageChange > 0
        });
      } else {
        setComparison(null);
      }

    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchVisits();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  const getComparisonText = () => {
    if (!comparison) return '';
    const timeFrameText = {
      '1day': 'yesterday',
      '1week': 'last week',
      '1month': 'last month',
      '3months': 'last 3 months',
      'custom': 'previous period'
    }[timeRange];
    return `${comparison.percentage}% ${comparison.increased ? 'up' : 'down'} from ${timeFrameText}`;
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0',  // Added defined border
      display: 'inline-block',      // Makes the width fit the content
      minWidth: '200px',           // Minimum width to maintain aesthetics
      maxWidth: '300px',           // Maximum width to keep it compact
      height: 'fit-content'        // Height adjusts to content
    }}>
      <h3 style={{ 
        margin: '0 0 15px 0', 
        color: '#666',
        fontSize: '16px',
        fontWeight: '600'
      }}>
        Number of Patients
      </h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            color: '#2c3e50'  // Darker color for better contrast
          }}>
            {visitsCount}
          </div>
          {comparison && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: comparison.increased ? '#28a745' : '#dc3545',
              fontSize: '14px',
              padding: '5px 0'
            }}>
              {comparison.increased ? <FaArrowUp /> : <FaArrowDown />}
              <span style={{ marginLeft: '5px' }}>{getComparisonText()}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VisitsWidget;