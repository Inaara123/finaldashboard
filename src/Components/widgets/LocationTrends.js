// src/components/widgets/LocationTrends.js
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

const LocationTrends = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [locations, setLocations] = useState([]);
  const [top5Locations, setTop5Locations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('top5');
  const [isLoading, setIsLoading] = useState(true);

  const colorPalette = [
    'rgb(255, 99, 132)',   // Red
    'rgb(54, 162, 235)',   // Blue
    'rgb(75, 192, 192)',   // Teal
    'rgb(255, 206, 86)',   // Yellow
    'rgb(153, 102, 255)',  // Purple
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
        startDateTime.setDate(now.getDate() - 7);
    }

    return {
      start: startDateTime,
      end: now
    };
  };

  const getLocationFromAddress = (address) => {
    if (!address) return null;
    return address.split(',')[0].trim();
  };

  const getTop5Locations = (appointmentsData) => {
    const locationCounts = {};
    appointmentsData.forEach(appointment => {
      const location = getLocationFromAddress(appointment.patients?.address);
      if (location) {
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });

    return Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location]) => location);
  };

  useEffect(() => {
    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate, selectedLocation]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const timeConstraint = getTimeRange();

      // Fetch appointments with patient data
      let query = supabase
        .from('appointments')
        .select(`
          appointment_id,
          appointment_time,
          patient_id,
          patients (
            address
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

      // Process unique locations
      const uniqueLocations = [...new Set(
        appointmentsData
          .map(d => getLocationFromAddress(d.patients?.address))
          .filter(Boolean)
      )];
      setLocations(uniqueLocations);

      // Get top 5 locations
      const top5 = getTop5Locations(appointmentsData);
      setTop5Locations(top5);

      // Process data for visualization
      const dailyData = new Map();
      
      appointmentsData.forEach(appointment => {
        const date = new Date(appointment.appointment_time).toLocaleDateString();
        const location = getLocationFromAddress(appointment.patients?.address);

        if (!location) return;

        if (!dailyData.has(date)) {
          dailyData.set(date, {});
          uniqueLocations.forEach(loc => dailyData.get(date)[loc] = 0);
        }

        dailyData.get(date)[location]++;
      });

      // Convert data for chart
      const dates = Array.from(dailyData.keys()).sort((a, b) => 
        new Date(a) - new Date(b)
      );

      const datasets = selectedLocation === 'top5'
        ? top5.map((location, index) => ({
            label: location,
            data: dates.map(date => dailyData.get(date)[location] || 0),
            borderColor: colorPalette[index],
            backgroundColor: colorPalette[index],
            tension: 0.4,
            fill: false
          }))
        : [{
            label: selectedLocation,
            data: dates.map(date => dailyData.get(date)[selectedLocation] || 0),
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
        text: 'Patient Location Trends'
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
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          <option value="top5">Top 5 Locations</option>
          {locations.map(location => (
            <option key={location} value={location}>
              {location}
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

export default LocationTrends;