import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const OldVsNewWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [data, setData] = useState({ new: 0, oldFollowup: 0, oldFresh: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

        let previousQuery = supabase
          .from('appointments')
          .select('patient_id')
          .eq('hospital_id', hospitalId)
          .lt('appointment_time', startDateTime.toISOString());

        if (doctorId !== 'all') {
          previousQuery = previousQuery.eq('doctor_id', doctorId);
        }

        const { data: previousPatients, error: previousError } = await previousQuery;
        if (previousError) throw previousError;

        const patientsWithHistory = new Set(previousPatients.map(app => app.patient_id));

        let currentQuery = supabase
          .from('appointments')
          .select('patient_id, appointment_time, is_follow_up')
          .eq('hospital_id', hospitalId)
          .gte('appointment_time', startDateTime.toISOString())
          .lte('appointment_time', endDateTime.toISOString())
          .order('appointment_time', { ascending: true });

        if (doctorId !== 'all') {
          currentQuery = currentQuery.eq('doctor_id', doctorId);
        }

        const { data: currentAppointments, error: currentError } = await currentQuery;
        if (currentError) throw currentError;

        const becameOldDuringRange = new Set();
        let newCount = 0;
        let oldFollowupCount = 0;
        let oldFreshCount = 0;

        currentAppointments.forEach(appointment => {
          const { patient_id, is_follow_up } = appointment;

          if (patientsWithHistory.has(patient_id) || becameOldDuringRange.has(patient_id)) {
            if (is_follow_up === 'Follow up') {
              oldFollowupCount++;
            } else {
              oldFreshCount++;
            }
          } else {
            newCount++;
            becameOldDuringRange.add(patient_id);
          }
        });

        setData({
          new: newCount,
          oldFollowup: oldFollowupCount,
          oldFresh: oldFreshCount
        });

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) return <div style={styles.loading}>Loading...</div>;

  if (error) return <div style={styles.error}>{error}</div>;

  const total = data.new + data.oldFollowup + data.oldFresh;

  return (
    <div style={styles.container}>
      <div style={styles.line}>
        New Patients - {data.new} ({((data.new/total)*100).toFixed(1)}%)
      </div>
      <div style={styles.line}>
        Old Patients Fresh Consultation - {data.oldFresh} ({((data.oldFresh/total)*100).toFixed(1)}%)
      </div>
      <div style={styles.line}>
        Old Patients FollowUp - {data.oldFollowup} ({((data.oldFollowup/total)*100).toFixed(1)}%)
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '15px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
  },
  line: {
    padding: '8px 0',
    fontSize: '14px',
    color: '#333',
  },
  loading: {
    padding: '15px',
    textAlign: 'center',
    color: '#666',
  },
  error: {
    padding: '15px',
    textAlign: 'center',
    color: '#f44336',
  }
};

export default OldVsNewWidget;
// import React, { useState, useEffect } from 'react';
// import { supabase } from '../../supabaseClient';
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   LabelList
// } from 'recharts';

// const OldVsNewWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
//   const [data, setData] = useState({ new: 0, oldFollowup: 0, oldFresh: 0 });
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [showPercentage, setShowPercentage] = useState(false);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setIsLoading(true);
//         setError(null);

//         let startDateTime = new Date();
//         let endDateTime = new Date();

//         switch (timeRange) {
//           case '1day':
//             startDateTime.setDate(startDateTime.getDate() - 1);
//             break;
//           case '1week':
//             startDateTime.setDate(startDateTime.getDate() - 7);
//             break;
//           case '1month':
//             startDateTime.setMonth(startDateTime.getMonth() - 1);
//             break;
//           case '3months':
//             startDateTime.setMonth(startDateTime.getMonth() - 3);
//             break;
//           case 'custom':
//             if (startDate && endDate) {
//               startDateTime = new Date(startDate);
//               endDateTime = new Date(endDate);
//             }
//             break;
//           default:
//             startDateTime.setDate(startDateTime.getDate() - 1);
//         }

//         let previousQuery = supabase
//           .from('appointments')
//           .select('patient_id')
//           .eq('hospital_id', hospitalId)
//           .lt('appointment_time', startDateTime.toISOString());

//         if (doctorId !== 'all') {
//           previousQuery = previousQuery.eq('doctor_id', doctorId);
//         }

//         const { data: previousPatients, error: previousError } = await previousQuery;
//         if (previousError) throw previousError;

//         const patientsWithHistory = new Set(previousPatients.map(app => app.patient_id));

//         let currentQuery = supabase
//           .from('appointments')
//           .select('patient_id, appointment_time, is_follow_up')
//           .eq('hospital_id', hospitalId)
//           .gte('appointment_time', startDateTime.toISOString())
//           .lte('appointment_time', endDateTime.toISOString())
//           .order('appointment_time', { ascending: true });

//         if (doctorId !== 'all') {
//           currentQuery = currentQuery.eq('doctor_id', doctorId);
//         }

//         const { data: currentAppointments, error: currentError } = await currentQuery;
//         if (currentError) throw currentError;

//         const becameOldDuringRange = new Set();
//         let newCount = 0;
//         let oldFollowupCount = 0;
//         let oldFreshCount = 0;

//         currentAppointments.forEach(appointment => {
//           const { patient_id, is_follow_up } = appointment;

//           if (patientsWithHistory.has(patient_id) || becameOldDuringRange.has(patient_id)) {
//             if (is_follow_up === 'Follow up') {
//               oldFollowupCount++;
//             } else {
//               oldFreshCount++;
//             }
//           } else {
//             newCount++;
//             becameOldDuringRange.add(patient_id);
//           }
//         });

//         setData({
//           new: newCount,
//           oldFollowup: oldFollowupCount,
//           oldFresh: oldFreshCount
//         });

//       } catch (error) {
//         console.error('Error fetching data:', error);
//         setError('Failed to load data');
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchData();
//   }, [hospitalId, doctorId, timeRange, startDate, endDate]);

//   const getChartData = () => {
//     const total = data.new + data.oldFollowup + data.oldFresh;
//     if (total === 0) return [];
    
//     return [
//       {
//         name: 'New Patients',
//         value: showPercentage ? ((data.new / total) * 100).toFixed(1) : data.new,
//         actualValue: data.new
//       },
//       {
//         name: 'Old Patients (Follow up)',
//         value: showPercentage ? ((data.oldFollowup / total) * 100).toFixed(1) : data.oldFollowup,
//         actualValue: data.oldFollowup
//       },
//       {
//         name: 'Old Patients (Fresh)',
//         value: showPercentage ? ((data.oldFresh / total) * 100).toFixed(1) : data.oldFresh,
//         actualValue: data.oldFresh
//       }
//     ];
//   };

//   if (isLoading) return (
//     <div style={styles.widget}>
//       <div style={styles.header}>
//         <h3 style={styles.title}>Patient Visit Types</h3>
//       </div>
//       <div style={styles.loading}>Loading...</div>
//     </div>
//   );

//   if (error) return (
//     <div style={styles.widget}>
//       <div style={styles.header}>
//         <h3 style={styles.title}>Patient Visit Types</h3>
//       </div>
//       <div style={styles.error}>{error}</div>
//     </div>
//   );

//   const total = data.new + data.oldFollowup + data.oldFresh;


//   return (
//     <div style={styles.widget}>
//       <div style={styles.header}>
//         <h3 style={styles.title}>Patient Visit Types</h3>
//       </div>
//       <div style={styles.summary}>
//         <div style={styles.summaryItem}>
//           <span style={styles.summaryLabel}>New Patients:</span>
//           <span style={styles.summaryValue}>{data.new} ({((data.new/total)*100).toFixed(1)}%)</span>
//         </div>
//         <div style={styles.summaryItem}>
//           <span style={styles.summaryLabel}>Old Patients (Follow up):</span>
//           <span style={styles.summaryValue}>{data.oldFollowup} ({((data.oldFollowup/total)*100).toFixed(1)}%)</span>
//         </div>
//         <div style={styles.summaryItem}>
//           <span style={styles.summaryLabel}>Old Patients (Fresh):</span>
//           <span style={styles.summaryValue}>{data.oldFresh} ({((data.oldFresh/total)*100).toFixed(1)}%)</span>
//         </div>
//       </div>
//       <div style={styles.chartContainer}>
//         <ResponsiveContainer width="100%" height={300}>
//         <BarChart
//   data={[
//     {
//       name: 'New Patients',
//       value: data.new,
//       fill: '#4CAF50'
//     },
//     {
//       name: 'Old Patients (Follow up)',
//       value: data.oldFollowup,
//       fill: '#2196F3'
//     },
//     {
//       name: 'Old Patients (Fresh)',
//       value: data.oldFresh,
//       fill: '#FFC107'
//     }
//   ]}
//   layout="horizontal"
//   margin={{ top: 40, right: 30, left: 40, bottom: 5 }}
// >
//   <XAxis type="category" dataKey="name" />
//   <YAxis type="number" domain={[0, 'auto']} />
//   <Tooltip
//     formatter={(value, name) => [`${value} (${((value/total)*100).toFixed(1)}%)`, name]}
//   />
//   <Bar dataKey="value">
//     <LabelList
//       dataKey="value"
//       position="top"
//       formatter={(value) => `${value} (${((value/total)*100).toFixed(1)}%)`}
//       content={({ x, y, value, width }) => {
//         // Calculate the text content
//         const text = `${value} (${((value/total)*100).toFixed(1)}%)`;
//         // Estimate text width (approximately 7px per character)
//         const textWidth = text.length * 7;
//         // Add padding
//         const rectWidth = textWidth + 20;
        
//         return (
//           <g>
//             <rect
//               x={x + width/2 - rectWidth/2}
//               y={y - 25}
//               width={rectWidth}
//               height="20"
//               fill="white"
//               stroke="#ccc"
//               rx="3"
//               ry="3"
//             />
//             <text
//               x={x + width/2}
//               y={y - 10}
//               textAnchor="middle"
//               fill="#666"
//               fontSize="12"
//             >
//               {text}
//             </text>
//           </g>
//         );
//       }}
//     />
//   </Bar>
// </BarChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   );
// };

// const styles = {
//     widget: {
//         padding: '20px',
//         backgroundColor: '#ffffff',
//         borderRadius: '8px',
//         boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
//         border: '1px solid #e0e0e0', // Added border
//         position: 'relative', // Added position
//         overflow: 'hidden', // Added overflow
//       },
//   header: {
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: '20px',
//   },
//   title: {
//     margin: 0,
//     fontSize: '1.2rem',
//     color: '#333',
//   },
//   chartContainer: {
//     height: '300px',
//     marginTop: '20px',
//     position: 'relative', // Added position
//   },

//   summary: {
//     display: 'flex',
//     justifyContent: 'space-around',
//     marginBottom: '20px',
//     flexWrap: 'wrap',
//   },
//   summaryItem: {
//     padding: '10px',
//     textAlign: 'center',
//   },
//   summaryLabel: {
//     display: 'block',
//     fontSize: '0.9rem',
//     color: '#666',
//     marginBottom: '5px',
//   },
//   summaryValue: {
//     fontSize: '1.1rem',
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   switch: {
//     position: 'relative',
//     display: 'inline-flex',
//     alignItems: 'center',
//     cursor: 'pointer',
//   },
//   switchLabel: {
//     marginLeft: '10px',
//     fontSize: '0.9rem',
//     color: '#666',
//   },
//   loading: {
//     textAlign: 'center',
//     padding: '20px',
//     color: '#666',
//   },
//   error: {
//     textAlign: 'center',
//     padding: '20px',
//     color: '#f44336',
//   }
// };

// export default OldVsNewWidget;