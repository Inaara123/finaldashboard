// src/components/widgets/GenderTrend.js
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

const GenderTrends = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [genderTypes, setGenderTypes] = useState([]);
  const [selectedGender, setSelectedGender] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Predefined colors for gender categories
  const colorPalette = [
    'rgb(54, 162, 235)',   // Blue (Male)
    'rgb(255, 99, 132)',   // Pink (Female)
    'rgb(75, 192, 192)',   // Teal (Other)
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
  }, [hospitalId, doctorId, timeRange, startDate, endDate, selectedGender]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const timeConstraint = getTimeRange();

      // Fetch unique gender types
      const { data: genderData, error: genderError } = await supabase
        .from('patients')
        .select('gender')
        .neq('gender', null)
        .limit(1000);

      if (genderError) throw genderError;

      const uniqueGenders = [...new Set(
        genderData
          .map(d => d.gender)
          .filter(Boolean)
      )];
      setGenderTypes(uniqueGenders);

      // Fetch appointments with patient data
      let query = supabase
        .from('appointments')
        .select(`
          appointment_id,
          appointment_time,
          patient_id,
          patients (
            gender
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
        const gender = appointment.patients?.gender;

        if (!gender) return;

        if (!dailyData.has(date)) {
          dailyData.set(date, {});
          uniqueGenders.forEach(g => dailyData.get(date)[g] = 0);
        }

        dailyData.get(date)[gender]++;
      });

      // Convert data for chart
      const dates = Array.from(dailyData.keys()).sort((a, b) => 
        new Date(a) - new Date(b)
      );

      const datasets = selectedGender === 'all'
        ? uniqueGenders.map((gender, index) => ({
            label: gender,
            data: dates.map(date => dailyData.get(date)[gender] || 0),
            borderColor: colorPalette[index % colorPalette.length],
            backgroundColor: colorPalette[index % colorPalette.length],
            tension: 0.4,
            fill: false
          }))
        : [{
            label: selectedGender,
            data: dates.map(date => dailyData.get(date)[selectedGender] || 0),
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
        text: 'Patient Gender Distribution Trends'
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
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          <option value="all">All Genders</option>
          {genderTypes.map(gender => (
            <option key={gender} value={gender}>
              {gender}
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

export default GenderTrends;