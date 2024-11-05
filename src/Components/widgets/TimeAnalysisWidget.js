// src/components/widgets/TimeAnalysisWidget.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const TimeAnalysisWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [timeMetrics, setTimeMetrics] = useState({
    avgWaitTime: 0,
    avgConsultTime: 0
  });
  const [loading, setLoading] = useState(true);

  // Icons for the metrics
  const icons = {
    waitTime: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
      </svg>
    ),
    consultTime: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13,7H11V12L15.2,14.2L16,12.9L12.5,11.15V7Z" />
      </svg>
    )
  };

  const formatDuration = (minutes) => {
    if (minutes < 1) return 'Less than a minute';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}min`;
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

  const fetchTimeMetrics = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();
  
      let query = supabase
        .from('appointments')
        .select('appointment_time, consultation_start_time, consultation_end_time')
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', currentStart.toISOString())
        .lte('appointment_time', currentEnd.toISOString())
        .not('consultation_start_time', 'is', null)
        .not('consultation_end_time', 'is', null);
  
      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }
  
      const { data, error } = await query;
  
      if (error) throw error;
  
      let totalWaitTime = 0;
      let totalConsultTime = 0;
      let validRecords = 0;
  
      data.forEach(record => {
        const appointmentTime = new Date(record.appointment_time);
        const consultationStartTime = new Date(record.consultation_start_time);
        const consultationEndTime = new Date(record.consultation_end_time);
  
        // Calculate consultation time in minutes
        const consultTimeMinutes = (consultationEndTime - consultationStartTime) / (1000 * 60);
  
        // Calculate wait time in minutes (same day only)
        let waitTimeMinutes = 0;
        if (appointmentTime.toDateString() === consultationStartTime.toDateString()) {
          waitTimeMinutes = (consultationStartTime - appointmentTime) / (1000 * 60);
        }
  
        // Only include reasonable times (under 2 hours for consultation)
        if (waitTimeMinutes >= 0 && consultTimeMinutes >= 0 && consultTimeMinutes <= 120) {
          console.log(`Record ${validRecords + 1}:`, {
            consultStart: consultationStartTime.toISOString(),
            consultEnd: consultationEndTime.toISOString(),
            consultMinutes: consultTimeMinutes.toFixed(2)
          });
          
          totalWaitTime += waitTimeMinutes;
          totalConsultTime += consultTimeMinutes;
          validRecords++;
        }
      });
  
      const avgWaitMinutes = validRecords > 0 ? Math.round(totalWaitTime / validRecords) : 0;
      const avgConsultMinutes = validRecords > 0 ? Math.round(totalConsultTime / validRecords) : 0;
  
      console.log('Averages:', {
        avgWaitMinutes,
        avgConsultMinutes,
        validRecords
      });
  
      setTimeMetrics({
        avgWaitTime: avgWaitMinutes,
        avgConsultTime: avgConsultMinutes
      });
  
    } catch (error) {
      console.error('Error fetching time metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchTimeMetrics();
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
      <h3 style={{ 
        margin: '0 0 20px 0',
        color: '#666',
        fontSize: '16px',
        fontWeight: '600'
      }}>
        Time Analysis
      </h3>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '20px 0'
        }}>
          {/* Wait Time */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              color: '#FF9800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#FF980015'
            }}>
              {icons.waitTime}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#666'
            }}>
              Avg. Wait Time
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#FF9800'
            }}>
              {formatDuration(timeMetrics.avgWaitTime)}
            </div>
          </div>

          {/* Consultation Time */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              color: '#4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#4CAF5015'
            }}>
              {icons.consultTime}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#666'
            }}>
              Avg. Consult Time
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#4CAF50'
            }}>
              {formatDuration(timeMetrics.avgConsultTime)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeAnalysisWidget;