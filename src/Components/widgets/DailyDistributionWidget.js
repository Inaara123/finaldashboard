import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
  Cell
} from 'recharts';

const DailyDistributionWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const dayColors = {
    'Sunday': '#FF9800',
    'Monday': '#4CAF50',
    'Tuesday': '#2196F3',
    'Wednesday': '#9C27B0',
    'Thursday': '#F44336',
    'Friday': '#009688',
    'Saturday': '#795548'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let startDateTime = new Date();
        let endDateTime = new Date();

        switch (timeRange) {
          case '1day':
            startDateTime.setDate(startDateTime.getDate() - 1);
            break;
          case '1week':
            startDateTime.setDate(startDateTime.getDate() - 7);
            break;
          case '1month':
            startDateTime.setMonth(startDateTime.getMonth() - 1);
            break;
          case '3months':
            startDateTime.setMonth(startDateTime.getMonth() - 3);
            break;
          case 'custom':
            if (startDate && endDate) {
              startDateTime = new Date(startDate);
              endDateTime = new Date(endDate);
            }
            break;
          default:
            startDateTime.setDate(startDateTime.getDate() - 1);
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

        const { data: appointments, error: queryError } = await query;
        if (queryError) throw queryError;

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Initialize counts and day occurrence tracking
        const dayCounts = {};
        const dayOccurrences = {};
        dayNames.forEach(day => {
          dayCounts[day] = 0;
          dayOccurrences[day] = 0;
        });

        // Count occurrences of each day in the date range
        let currentDate = new Date(startDateTime);
        while (currentDate <= endDateTime) {
          const dayName = dayNames[currentDate.getDay()];
          dayOccurrences[dayName]++;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Count appointments per day
        appointments.forEach(appointment => {
          const date = new Date(appointment.appointment_time);
          const dayName = dayNames[date.getDay()];
          dayCounts[dayName]++;
        });

        const total = appointments.length;

        const chartData = Object.entries(dayCounts).map(([day, count]) => ({
          name: day,
          value: count,
          percentage: total > 0 ? (count / total * 100).toFixed(1) : 0,
          average: Math.round(dayOccurrences[day] > 0 ? count / dayOccurrences[day] : 0),
          fill: dayColors[day]
        }));

        setData(chartData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) return (
    <div style={styles.fullWidthWidget}>
      <div style={styles.header}>
        <h3 style={styles.title}>Daily Patient Distribution</h3>
      </div>
      <div style={styles.loading}>Loading...</div>
    </div>
  );

  if (error) return (
    <div style={styles.fullWidthWidget}>
      <div style={styles.header}>
        <h3 style={styles.title}>Daily Patient Distribution</h3>
      </div>
      <div style={styles.error}>{error}</div>
    </div>
  );

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={styles.fullWidthWidget}>
      <div style={styles.header}>
        <h3 style={styles.title}>Daily Patient Distribution</h3>
        <div style={styles.totalAppointments}>
          Total Appointments: {total}
        </div>
      </div>
      
      <div style={styles.summary}>
        {data.map(item => (
          <div key={item.name} style={{
            ...styles.summaryItem,
            borderLeft: `4px solid ${dayColors[item.name]}`
          }}>
            <span style={styles.summaryLabel}>{item.name}</span>
            <span style={styles.summaryValue}>
              {item.value} ({item.percentage}%)
            </span>
            <span style={styles.summaryAverage}>
              Average number of Patients : {item.average}
            </span>
          </div>
        ))}
      </div>

      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 40, right: 30, left: 40, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="category" 
              dataKey="name"
              tick={{ fontSize: 14, fill: '#666' }}
              tickLine={{ stroke: '#666' }}
              axisLine={{ stroke: '#666' }}
              height={60}
              interval={0}
            />
            <YAxis 
              type="number" 
              domain={[0, 'auto']}
              tick={{ fontSize: 14, fill: '#666' }}
              tickLine={{ stroke: '#666' }}
              axisLine={{ stroke: '#666' }}
              label={{ value: 'Number of Appointments', angle: -90, position: 'insideLeft', offset: -20 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '10px'
              }}
              formatter={(value, name, props) => [
                `${value} appointments (${props.payload.percentage}%)
Daily Average: ${props.payload.average}`,
                props.payload.name
              ]}
            />
// ... (previous code remains the same until the Bar component)

<Bar 
  dataKey="value"
  radius={[4, 4, 0, 0]}
>
  {data.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={dayColors[entry.name]} />
  ))}
  <LabelList
    dataKey="value"
    position="top"
    content={(props) => {
      if (!props || !props.payload) return null;
      
      const { x, y, width, payload } = props;
      const text = `${payload.value} (${payload.percentage}%)
Avg: ${payload.average}`;
      const textWidth = Math.max(...text.split('\n').map(t => t.length)) * 7;
      const rectWidth = textWidth + 20;
      const lines = text.split('\n');
      
      return (
        <g>
          <rect
            x={x + width/2 - rectWidth/2}
            y={y - 35}
            width={rectWidth}
            height="30"
            fill="white"
            stroke="#ccc"
            rx="3"
            ry="3"
          />
          {lines.map((line, i) => (
            <text
              key={i}
              x={x + width/2}
              y={y - 20 + (i * 12)}
              textAnchor="middle"
              fill="#666"
              fontSize="12"
            >
              {line}
            </text>
          ))}
        </g>
      );
    }}
  />
</Bar>

          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const styles = {
  fullWidthWidget: {
    width: '100%',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    position: 'relative',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '2px solid #f0f0f0',
    paddingBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#333',
    fontWeight: '600',
  },
  totalAppointments: {
    fontSize: '1.1rem',
    color: '#666',
    fontWeight: '500',
  },
  chartContainer: {
    height: '400px',
    marginTop: '24px',
    position: 'relative',
    width: "100%"
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  summaryItem: {
    padding: '12px',
    textAlign: 'center',
    backgroundColor: 'white',
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryLabel: {
    display: 'block',
    fontSize: '1rem',
    color: '#666',
    marginBottom: '4px',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#333',
  },
  summaryAverage: {
    fontSize: '0.9rem',
    color: '#666',
    fontStyle: 'italic',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    fontSize: '1.1rem',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#f44336',
    fontSize: '1.1rem',
  }
};

export default DailyDistributionWidget;