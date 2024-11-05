// src/components/widgets/DiscoveryTrends.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Line } from 'react-chartjs-2';
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

const DiscoveryTrends = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [discoveryChannels, setDiscoveryChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Predefined colors for better visibility
  const colorPalette = [
    'rgb(255, 99, 132)',   // Red
    'rgb(54, 162, 235)',   // Blue
    'rgb(75, 192, 192)',   // Teal
    'rgb(255, 206, 86)',   // Yellow
    'rgb(153, 102, 255)',  // Purple
    'rgb(255, 159, 64)',   // Orange
    'rgb(46, 204, 113)',   // Green
    'rgb(142, 68, 173)',   // Dark Purple
    'rgb(52, 152, 219)',   // Light Blue
    'rgb(231, 76, 60)',    // Dark Red
  ];

  const getTimeRange = () => {
    const now = new Date();
    let startDateTime = new Date();

    if (timeRange === 'custom' && startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    switch (timeRange) {
      case '1day':
        startDateTime.setDate(now.getDate() - 1);
        break;
      case '1week':
        startDateTime.setDate(now.getDate() - 7);
        break;
      case '1month':
        startDateTime.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDateTime.setMonth(now.getMonth() - 3);
        break;
      default:
        startDateTime.setDate(now.getDate() - 7); // Default to 1 week
    }

    return {
      start: startDateTime,
      end: now
    };
  };

  useEffect(() => {
    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate, selectedChannel]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const timeConstraint = getTimeRange();

      // Fetch unique channels first
      const { data: channelsData, error: channelsError } = await supabase
        .from('patients')
        .select('how_did_you_get_to_know_us')
        .neq('how_did_you_get_to_know_us', null)
        .limit(1000);  // Adjust limit as needed

      if (channelsError) throw channelsError;

      const uniqueChannels = [...new Set(
        channelsData
          .map(d => d.how_did_you_get_to_know_us)
          .filter(Boolean)
      )];
      setDiscoveryChannels(uniqueChannels);

      // Fetch appointments with patient data
      let query = supabase
        .from('appointments')
        .select(`
          appointment_id,
          appointment_time,
          patient_id,
          patients (
            how_did_you_get_to_know_us
          )
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', timeConstraint.start.toISOString())
        .lte('appointment_time', timeConstraint.end.toISOString())
        .order('appointment_time', { ascending: true });

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      const { data: appointmentsData, error: appointmentsError } = await query;
      if (appointmentsError) throw appointmentsError;

      // Process data for visualization
      const dailyData = new Map();
      
      appointmentsData.forEach(appointment => {
        const date = new Date(appointment.appointment_time).toLocaleDateString();
        const channel = appointment.patients?.how_did_you_get_to_know_us;

        if (!channel) return;

        if (!dailyData.has(date)) {
          dailyData.set(date, {});
          uniqueChannels.forEach(ch => dailyData.get(date)[ch] = 0);
        }

        dailyData.get(date)[channel]++;
      });

      // Convert data for chart
      const dates = Array.from(dailyData.keys()).sort((a, b) => 
        new Date(a) - new Date(b)
      );

      const datasets = selectedChannel === 'all'
        ? uniqueChannels.map((channel, index) => ({
            label: channel,
            data: dates.map(date => dailyData.get(date)[channel] || 0),
            borderColor: colorPalette[index % colorPalette.length],
            backgroundColor: colorPalette[index % colorPalette.length],
            tension: 0.4,
            fill: false
          }))
        : [{
            label: selectedChannel,
            data: dates.map(date => dailyData.get(date)[selectedChannel] || 0),
            borderColor: colorPalette[0],
            backgroundColor: colorPalette[0],
            tension: 0.4,
            fill: false
          }];

      setChartData({
        labels: dates,
        datasets: datasets
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Patient Discovery Channel Trends'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    elements: {
      point: {
        radius: 3,
        hitRadius: 10,
        hoverRadius: 5
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <div style={{ marginBottom: '20px' }}>
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          <option value="all">All Channels</option>
          {discoveryChannels.map(channel => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </select>
      </div>
      
      {isLoading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '300px' 
        }}>
          Loading...
        </div>
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
};

export default DiscoveryTrends;