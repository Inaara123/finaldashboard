// src/components/Home.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { supabase } from '../supabaseClient';
import VisitsWidget from './widgets/VisitsWidjet';
import LocationsWidget from './widgets/LocationsWidget'; 
import DiscoveryWidget from './widgets/DiscoveryWidget';
import GenderWidget from './widgets/GenderWidget';
import OldVsNewWidget from './widgets/OldVsNewWidget';
import BookingTypeWidget from './widgets/BookingTypeWidget';
import TimeAnalysisWidget from './widgets/TimeAnalysisWidget';
import DailyDistributionWidget from './widgets/DailyDistributionWidget';
import TimeDistributionWidget from './widgets/TimeDistributionWidget';
import AgeWidget from './widgets/AgeWidget';
import PatientLocationWidget from './widgets/PatientLocationWidget';
import CorrelationsBoard from './widgets/CorrelationsBoard';
import GenderVsDay from './widgets/GendervsDay';
import GenderVsBooking from './widgets/GenderVsBooking';
import GenderVsLocation from './widgets/GenderVsLocation';
import AgeVsGender from './widgets/AgeVsGender';
import AgeVsDiscovery from './widgets/AgeVsDiscovery';
import LocationVsAge from './widgets/LocationVsAge';
import LocationVsDiscovery from './widgets/LocationVsDiscovery';
import DiscoveryTrends from './widgets/DiscoveryTrends';
import GenderTrends from './widgets/GenderTrends';
import LocationTrends from './widgets/LocationTrends';
import BookingTrends from './widgets/BookingTrends';
import Correlation from './widgets/Correlation';
const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [administrator, setAdministrator] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('1day');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchAdministrator = async () => {
      try {
        const { data, error } = await supabase
          .from('hospitals')
          .select('administrator')
          .eq('hospital_id', currentUser.uid)
          .single();

        if (error) throw error;
        if (data) {
          setAdministrator(data.administrator);
        }
      } catch (error) {
        console.error('Error fetching administrator:', error);
      }
    };

    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('doctor_id, name')
          .eq('hospital_id', currentUser.uid);

        if (error) throw error;
        if (data) {
          setDoctors(data);
          if (data.length === 1) {
            setSelectedDoctorId(data[0].doctor_id);
          } else {
            setSelectedDoctorId('all');
          }
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };

    if (currentUser) {
      fetchAdministrator();
      fetchDoctors();
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleTimeRangeClick = (range) => {
    setSelectedTimeRange(range);
    setShowCustomDates(range === 'custom');
    if (range !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleDoctorChange = (event) => {
    const doctorId = event.target.value;
    setSelectedDoctorId(doctorId);
  };

  return (
    <div style={{ 
      padding: '24px',
      backgroundColor: '#f5f6fa',
      minHeight: '100vh'
    }}>
      {/* Header section */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ margin: 0 }}>Hello, {administrator}</h1>
        <button 
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: '500'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
        >
          Logout
        </button>
      </div>

  
      {/* Controls section */}
      <div style={{ 
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
        }}>
          {doctors.length > 1 && (
            <select 
              value={selectedDoctorId}
              onChange={handleDoctorChange}
              style={{
                padding: '10px',
                fontSize: '16px',
                borderRadius: '4px',
                width: '200px',
                border: '1px solid #ccc',
                cursor: 'pointer',
                marginRight: '20px'
              }}
            >
              <option value="all">All Doctors</option>
              {doctors.map((doctor) => (
                <option key={doctor.doctor_id} value={doctor.doctor_id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          )}
  
          {/* Time range buttons */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
            flex: 1
          }}>
            {['1day', '1week', '1month', '3months', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeClick(range)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedTimeRange === range ? '#007bff' : '#f0f0f0',
                  color: selectedTimeRange === range ? 'white' : 'black',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseOver={(e) => {
                  if (selectedTimeRange !== range) {
                    e.target.style.backgroundColor = '#e0e0e0';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedTimeRange !== range) {
                    e.target.style.backgroundColor = '#f0f0f0';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {range === 'custom' ? 'Custom' : range.replace(/(\d+)/, '$1 ').charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
  
        {/* Custom date inputs */}
        {showCustomDates && (
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center'
          }}>
            <div>
              <label 
                htmlFor="startDate" 
                style={{ 
                  marginRight: '8px',
                  fontSize: '14px'
                }}
              >
                Start Date:
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label 
                htmlFor="endDate" 
                style={{ 
                  marginRight: '8px',
                  fontSize: '14px'
                }}
              >
                End Date:
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        )}
      </div>
  {/* Dashboard Grid */}
<div style={{ 
  display: 'grid',
  gap: '24px',
  gridTemplateColumns: 'repeat(12, 1fr)',
  gridAutoRows: 'minmax(200px, auto)'
}}>
  {/* First Row - Left Column (Stacked Visits and OldVsNew) */}
  <div style={{ 
    gridColumn: 'span 3',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  }}>
    {/* Visits Widget */}
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
      }
    }}>
      <VisitsWidget 
        hospitalId={currentUser.uid}
        doctorId={selectedDoctorId}
        timeRange={selectedTimeRange}
        startDate={startDate}
        endDate={endDate}
      />
    </div>

    {/* OldVsNew Widget */}
    <div style={{ 
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
      }
    }}>
      <OldVsNewWidget
        hospitalId={currentUser.uid}
        doctorId={selectedDoctorId}
        timeRange={selectedTimeRange}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  </div>

  {/* Locations Widget - Wider */}
  <div style={{ 
    gridColumn: 'span 5',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <LocationsWidget 
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Discovery Widget - Wider */}
  <div style={{ 
    gridColumn: 'span 4',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <DiscoveryWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Second Row */}
  <div style={{ 
    gridColumn: 'span 4',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  <div style={{ 
    gridColumn: 'span 4',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <TimeAnalysisWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  <div style={{ 
    gridColumn: 'span 4',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <BookingTypeWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Third Row */}
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <DailyDistributionWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Fourth Row */}
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <TimeDistributionWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Fifth Row */}
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <AgeWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Sixth Row */}
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <PatientLocationWidget
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Seventh Row - Correlations Section */}
  {/* Correlations Board */}
  <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <CorrelationsBoard
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>

  {/* Gender vs Day */}
  <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderVsDay
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  {/* Eigth Row - Correlations Section */}
  {/* GendervsBooking Board */}
  <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderVsBooking
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 6',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderVsLocation
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <AgeVsGender
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <AgeVsDiscovery
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <LocationVsAge
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <LocationVsDiscovery
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <DiscoveryTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    margin : '20px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <GenderTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    margin : '20px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <LocationTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    margin : '20px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <BookingTrends
      hospitalId={currentUser.uid}
      doctorId={selectedDoctorId}
      timeRange={selectedTimeRange}
      startDate={startDate}
      endDate={endDate}
    />
  </div>
  <div style={{ 
    gridColumn: 'span 12',
    backgroundColor: 'white',
    borderRadius: '12px',
    margin : '20px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  }}>
    <Correlation
      hospitalId={currentUser.uid}
    />
  </div>
</div>
</div>

  );
};

export default Home;
