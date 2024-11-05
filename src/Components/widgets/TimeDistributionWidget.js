// src/components/widgets/TimeDistributionWidget.js
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { supabase } from '../../supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const calculateMedian = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const TimeDistributionWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [percentageData, setPercentageData] = useState([]);

  const getColorForPercentage = (percentage) => {
    if (percentage >= 20) return '#4CAF50'; // High - Green
    if (percentage <= 5) return '#FF5252';  // Low - Red
    return '#2196F3';  // Medium - Blue
  };

  const formatTimeRange = (index) => {
    const startHour = Math.floor(index / 2);
    const endHour = Math.floor((index + 1) / 2);
    const startMinutes = (index % 2) * 30;
    const endMinutes = ((index + 1) % 2) * 30;
    
    const formatTime = (hour, minutes) => {
      const ampm = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const startTime = formatTime(startHour, startMinutes);
    const endTime = endMinutes === 0 ? 
      formatTime(endHour, 0) : 
      formatTime(startHour, 30);

    return `${startTime} - ${endTime}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        let startDateTime = new Date();
        let endDateTime = new Date();
        
        if (timeRange === 'custom' && startDate && endDate) {
          startDateTime = new Date(startDate);
          endDateTime = new Date(endDate);
        } else {
          endDateTime = new Date();
          switch (timeRange) {
            case '1day':
              startDateTime.setDate(endDateTime.getDate() - 1);
              break;
            case '1week':
              startDateTime.setDate(endDateTime.getDate() - 7);
              break;
            case '1month':
              startDateTime.setMonth(endDateTime.getMonth() - 1);
              break;
            case '3months':
              startDateTime.setMonth(endDateTime.getMonth() - 3);
              break;
            default:
              startDateTime.setDate(endDateTime.getDate() - 1);
          }
        }

        let query = supabase
          .from('appointments')
          .select('appointment_time')
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', startDateTime.toISOString())
          .lte('appointment_time', endDateTime.toISOString());

        if (doctorId !== 'all') {
          query = query.eq('doctor_id', doctorId);
        }

        const { data: appointments, error } = await query;

        if (error) throw error;

        const halfHourlyDistribution = new Array(48).fill(0);
        const dailyDistribution = new Map();

        // First, organize appointments by date and time slot
        appointments.forEach(appointment => {
          const date = new Date(appointment.appointment_time);
          const dateString = date.toDateString();
          const hour = date.getHours();
          const minutes = date.getMinutes();
          const intervalIndex = (hour * 2) + (minutes >= 30 ? 1 : 0);
          
          // Increment total distribution
          halfHourlyDistribution[intervalIndex]++;

          // Create a key combining date and time slot
          const key = `${dateString}-${intervalIndex}`;
          
          // Initialize counter for this day-interval if it doesn't exist
          if (!dailyDistribution.has(key)) {
            dailyDistribution.set(key, 0);
          }
          
          // Increment the counter for this day-interval
          dailyDistribution.set(key, dailyDistribution.get(key) + 1);
        });

        const totalVisits = halfHourlyDistribution.reduce((a, b) => a + b, 0);
        const daysDifference = Math.max(1, Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)));

        let firstNonZero = 0;
        let lastNonZero = 47;

        for (let i = 0; i < 48; i++) {
          if (halfHourlyDistribution[i] > 0) {
            firstNonZero = i;
            break;
          }
        }

        for (let i = 47; i >= 0; i--) {
          if (halfHourlyDistribution[i] > 0) {
            lastNonZero = i;
            break;
          }
        }

        const labels = Array.from({ length: 48 }, (_, i) => formatTimeRange(i));
        const trimmedData = halfHourlyDistribution.slice(firstNonZero, lastNonZero + 1);
        const trimmedLabels = labels.slice(firstNonZero, lastNonZero + 1);

        const formattedPercentages = trimmedLabels.map((label, index) => {
          const actualIndex = index + firstNonZero;
          const count = trimmedData[index];
          const percentage = ((count / totalVisits) * 100).toFixed(1);
          
          // Collect daily counts for this time slot
          const dailyCounts = [];
          for (let i = 0; i < daysDifference; i++) {
            const checkDate = new Date(startDateTime);
            checkDate.setDate(startDateTime.getDate() + i);
            const key = `${checkDate.toDateString()}-${actualIndex}`;
            const dayCount = dailyDistribution.get(key) || 0;
            dailyCounts.push(dayCount);
          }
          
          const medianPatients = Math.round(calculateMedian(dailyCounts));

          return {
            timeSlot: label,
            percentage,
            count,
            medianPatients
          };
        });

        setPercentageData(formattedPercentages);

        const percentages = trimmedData.map(value => 
          ((value / totalVisits) * 100).toFixed(1)
        );

        setData({
          labels: trimmedLabels,
          datasets: [
            {
              label: 'Visit Count',
              data: trimmedData,
              fill: false,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgb(75, 192, 192)',
              yAxisID: 'y',
            },
            {
              label: 'Percentage',
              data: percentages,
              fill: false,
              borderColor: 'rgb(255, 99, 132)',
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgb(255, 99, 132)',
              yAxisID: 'y1',
            }
          ],
        });

      } catch (error) {
        console.error('Error fetching time distribution data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Daily Visit Time Distribution',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            if (datasetLabel === 'Visit Count') {
              return `Visits: ${value}`;
            } else {
              return `Percentage: ${value}%`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Visits'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        title: {
          display: true,
          text: 'Percentage (%)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time Range'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      height: 'auto',
      minHeight: '400px'
    }}>
      <div style={{ flex: '3' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            Loading...
          </div>
        ) : data ? (
          <Line data={data} options={options} />
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            No data available
          </div>
        )}
      </div>
      <div style={{ 
        flex: '1',
        borderLeft: '1px solid #eee',
        paddingLeft: '20px',
        overflowY: 'auto',
        maxHeight: '400px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Time Distribution</h3>
        {percentageData.map((item, index) => (
          <div
            key={index}
            style={{
              padding: '8px',
              margin: '4px 0',
              borderRadius: '4px',
              backgroundColor: getColorForPercentage(parseFloat(item.percentage)),
              color: 'white',
              fontSize: '14px'
            }}
          >
            {item.timeSlot}: {item.percentage}% ({item.count} visits) 
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeDistributionWidget;