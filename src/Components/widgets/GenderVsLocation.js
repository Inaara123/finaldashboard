import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { HeatMapGrid } from 'react-grid-heatmap';
import Switch from 'react-switch';
import PropTypes from 'prop-types';
import { supabase } from '../../supabaseClient';

const WidgetContainer = styled.div`
  background-color: #1e1e1e;
  padding: 20px;
  border-radius: 15px;
  color: #fff;
  width: 80%;
  margin-left: 75px;
  height: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #1e1e1e;
  padding: 20px;
  border-radius: 15px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ShowAllButton = styled.button`
  background-color: purple;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  margin-left: 10px;
  
  &:hover {
    background-color: #800080;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`;

const YLabelContainer = styled.div`
  display: flex;
  align-items: center;
  padding-right: 10px;
  justify-content: flex-end;
  width: 100px;
`;

const WidgetTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
`;

const HeatmapContainer = styled.div`
  width: 100%;
  height: auto;
`;

const BreakdownContainer = styled.div`
  margin-top: 20px;
  padding: 20px;
  background-color: #2a2a2a;
  border-radius: 10px;
`;

const GenderSection = styled.div`
  margin-bottom: 20px;
`;

const GenderTitle = styled.h4`
  color: #fff;
  margin-bottom: 10px;
  font-size: 16px;
`;

const BreakdownItem = styled.div`
  color: #e0e0e0;
  margin: 8px 0;
  font-size: 14px;
  display: flex;
  align-items: center;
`;

const PercentageBar = styled.div`
  height: 8px;
  background-color: rgba(128, 0, 128, 0.3);
  border-radius: 4px;
  margin-left: 10px;
  flex: 1;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.percentage}%;
    background-color: purple;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;

const GenderVsLocation = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [showPercentage, setShowPercentage] = useState(true);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [allLocationsData, setAllLocationsData] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [genders] = useState(['Male', 'Female']);
  const [locations, setLocations] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [genderBreakdown, setGenderBreakdown] = useState({ male: {}, female: {} });
  const [genderTotals, setGenderTotals] = useState({ male: 0, female: 0 });

  const getTimeRangeFilter = () => {
    const now = new Date();
    switch (timeRange) {
      case '1day':
        return new Date(now - 24 * 60 * 60 * 1000).toISOString();
      case '1week':
        return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '1month':
        return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '3months':
        return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
      case 'custom':
        return startDate ? new Date(startDate).toISOString() : null;
      default:
        return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const fetchCorrelationData = async () => {
    try {
      setError(null);
      setIsLoading(true);
      let query = supabase
        .from('appointments')
        .select(`
          appointment_time,
          patients!inner(
            gender,
            address
          )
        `)
        .eq('hospital_id', hospitalId);

      if (doctorId !== 'all') {
        query = query.eq('doctor_id', doctorId);
      }

      if (timeRange === 'custom' && startDate && endDate) {
        query = query
          .gte('appointment_time', startDate)
          .lte('appointment_time', endDate);
      } else {
        const timeFilter = getTimeRangeFilter();
        if (timeFilter) {
          query = query.gte('appointment_time', timeFilter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const locationMap = new Map();
      data.forEach(appointment => {
        if (!appointment.patients?.address || !appointment.patients?.gender) return;
        
        const location = appointment.patients.address.split(',')[0].trim();
        const gender = appointment.patients.gender.toLowerCase();
        
        if (!locationMap.has(location)) {
          locationMap.set(location, { male: 0, female: 0 });
        }
        locationMap.get(location)[gender]++;
      });

      // Sort locations by total patients
      const sortedLocations = Array.from(locationMap.entries())
        .sort((a, b) => (b[1].male + b[1].female) - (a[1].male + a[1].female));

      // Set top 5 locations and all locations
      const top5Locations = sortedLocations.slice(0, 5).map(([loc]) => loc);
      const allLocationsList = sortedLocations.map(([loc]) => loc);

      setLocations(top5Locations);
      setAllLocations(allLocationsList);

      // Prepare heatmap data for both views
      const prepareHeatmapData = (locationsList) => {
        return ['Male', 'Female'].map(gender => 
          locationsList.map(loc => 
            locationMap.get(loc)[gender.toLowerCase()] || 0
          )
        );
      };

      setHeatmapData(prepareHeatmapData(top5Locations));
      setAllLocationsData(prepareHeatmapData(allLocationsList));

      // Calculate totals and breakdown
      const totals = { male: 0, female: 0 };
      const breakdown = { male: {}, female: {} };

      locationMap.forEach((value, location) => {
        totals.male += value.male;
        totals.female += value.female;
        breakdown.male[location] = value.male;
        breakdown.female[location] = value.female;
      });

      setGenderTotals(totals);
      setGenderBreakdown(breakdown);
      setTotalPatients(totals.male + totals.female);

    } catch (error) {
      setError(error.message);
      console.error('Error fetching correlation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrelationData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Location</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Location</WidgetTitle>
        <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>
          Error: {error}
        </div>
      </WidgetContainer>
    );
  }

  const formatData = (data, locationsList) => {
    return data.map((row, genderIndex) =>
      row.map((value) => {
        if (showPercentage) {
          const gender = genders[genderIndex].toLowerCase();
          const genderTotal = genderTotals[gender] || 0;
          return genderTotal > 0 ? ((value / genderTotal) * 100).toFixed(2) : '0.00';
        }
        return value;
      })
    );
  };

  const renderHeatmap = (data, locationsList) => (
    <HeatMapGrid
      data={formatData(data, locationsList)}
      xLabels={locationsList}
      yLabels={genders}
      cellRender={(x, y, value) => {
        const rawValue = data[y]?.[x] || 0;
        return (
          <div style={{ fontSize: '12px', color: 'white' }}>
            {showPercentage ? `${value}%` : value}
            <br />
            ({rawValue})
          </div>
        );
      }}
      cellStyle={(_x, _y, value) => ({
        background: `rgba(128, 0, 128, ${showPercentage ? parseFloat(value) / 100 : value / Math.max(...data.flat())})`,
        fontSize: '15px',
        color: '#ffffff',
        border: '1px solid #2a2a2a',
        transition: 'all 0.3s ease'
      })}
      cellHeight="30px"
      xLabelsStyle={() => ({
        color: 'white',
        fontSize: '14px',
        padding: '2px',
      })}
      yLabelsStyle={() => ({
        color: 'white',
        fontSize: '14px',
        padding: '2px',
      })}
    />
  );

  const renderBreakdown = (gender, total) => {
    const genderLower = gender.toLowerCase();
    if (!genderBreakdown[genderLower]) return null;

    return Object.entries(genderBreakdown[genderLower])
      .sort(([, a], [, b]) => b - a)
      .map(([location, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${gender}-${location}`}>
            {percentage}% of {gender}s from {location}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Gender vs Location
        <div>
          <Switch
            onChange={() => setShowPercentage(!showPercentage)}
            checked={showPercentage}
            offColor="#888"
            onColor="#66ff66"
            uncheckedIcon={false}
            checkedIcon={false}
          />
          <ShowAllButton onClick={() => setShowAllLocations(true)}>
            Show All Locations
          </ShowAllButton>
        </div>
      </WidgetTitle>
      <HeatmapContainer>
        {renderHeatmap(heatmapData, locations)}
      </HeatmapContainer>

      {showAllLocations && (
        <ModalOverlay>
          <ModalContent>
            <CloseButton onClick={() => setShowAllLocations(false)}>&times;</CloseButton>
            <h2>All Locations</h2>
            {renderHeatmap(allLocationsData, allLocations)}
            <BreakdownContainer>
              <GenderSection>
                <GenderTitle>Male</GenderTitle>
                {renderBreakdown('Male', genderTotals.male)}
              </GenderSection>
              <GenderSection>
                <GenderTitle>Female</GenderTitle>
                {renderBreakdown('Female', genderTotals.female)}
              </GenderSection>
            </BreakdownContainer>
          </ModalContent>
        </ModalOverlay>
      )}
    </WidgetContainer>
  );
};

GenderVsLocation.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default GenderVsLocation;