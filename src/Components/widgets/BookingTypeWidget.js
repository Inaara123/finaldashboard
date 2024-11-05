// src/components/widgets/BookingTypeWidget.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const BookingTypeWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [bookingTypes, setBookingTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPercentage, setShowPercentage] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);

  // Define all possible booking types
  const allBookingTypes = [
    'Booking',
    'Walk-in'
  ];

  // Color mapping for different booking types
  const bookingTypeColors = {
    'Booking': '#4CAF50',    // Green
    'Walk-in': '#FF9800'     // Orange
  };

  // SVG icons for booking types
  const bookingTypeIcons = {
    'Booking': (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19,4H18V2H16V4H8V2H6V4H5C3.89,4 3,4.9 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20M19,8H5V6H19V8M12,13H17V18H12V13Z" />
      </svg>
    ),
    'Walk-in': (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.12,10H19V8.2H15.38L13.38,4.87C13.08,4.37 12.54,4.03 11.92,4.03C11.74,4.03 11.58,4.06 11.42,4.11L6,5.8V11H7.8V7.33L9.91,6.67L6,22H7.8L10.67,13.89L13,17V22H14.8V15.59L12.31,11.05L13.04,8.18M14,3.8C15,3.8 15.8,3 15.8,2C15.8,1 15,0.2 14,0.2C13,0.2 12.2,1 12.2,2C12.2,3 13,3.8 14,3.8Z" />
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

  const fetchBookingTypes = async () => {
    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();

      let query = supabase
        .from('appointments')
        .select('appointment_type')
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', currentStart.toISOString())
        .lte('appointment_time', currentEnd.toISOString())
        .in('appointment_type', allBookingTypes);

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Initialize counts for all booking types
      const bookingTypeCounts = allBookingTypes.reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {});

      // Count occurrences of each booking type
      data.forEach(item => {
        const type = item.appointment_type;
        if (allBookingTypes.includes(type)) {
          bookingTypeCounts[type]++;
        }
      });

      // Convert to array and include all booking types
      const sortedBookingTypes = allBookingTypes.map(type => ({
        source: type,
        count: bookingTypeCounts[type],
        percentage: (bookingTypeCounts[type] / (data.length || 1)) * 100
      })).sort((a, b) => b.count - a.count);

      setBookingTypes(sortedBookingTypes);
      setTotalVisits(data.length);

    } catch (error) {
      console.error('Error fetching booking types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchBookingTypes();
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
          Appointment Type 
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
          {bookingTypes.map((type, index) => (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                color: bookingTypeColors[type.source],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: `${bookingTypeColors[type.source]}15`
              }}>
                {bookingTypeIcons[type.source]}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>
                {type.source}
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: bookingTypeColors[type.source]
              }}>
                {showPercentage 
                  ? `${type.percentage.toFixed(1)}%`
                  : type.count
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingTypeWidget;