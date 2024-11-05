import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  width: 100%;
  height: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const YLabelContainer = styled.div`
  display: flex;
  align-items: center;
  padding-right: 10px;
  justify-content: flex-end;
  width: 150px;
  font-size: 0.8rem;
  line-height: 1.2;
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

const LocationSection = styled.div`
  margin-bottom: 20px;
`;

const LocationTitle = styled.h4`
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
  background-color: rgba(0, 128, 255, 0.3);
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
    background-color: #0080ff;
    border-radius: 4px;
    transition: width 0.3s ease;
  }
`;

const ShowAllButton = styled.button`
  background-color: #0080ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  margin-left: 16px;
  font-size: 14px;
  
  &:hover {
    background-color: #0066cc;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #1e1e1e;
  padding: 30px;
  border-radius: 15px;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  position: relative;
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

const ErrorMessage = styled.div`
  color: #ff6b6b;
  padding: 20px;
  text-align: center;
  background-color: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
  margin: 10px 0;
`;

const CellContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover .tooltip {
    visibility: visible;
    opacity: 1;
  }
`;

const Tooltip = styled.div`
  visibility: hidden;
  opacity: 0;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.9);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  transition: opacity 0.2s;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.9) transparent transparent transparent;
  }
`;

const initialState = {
  showPercentage: true,
  heatmapData: [],
  totalPatients: 0,
  locations: [],
  ageGroups: [],
  isLoading: true,
  error: null,
  locationBreakdown: {},
  locationTotals: {},
  ageSettings: null,
  showAllModal: false,
  allLocationsData: null
};

const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getAgeGroup = (age, ageSettings) => {
  if (!ageSettings?.all) return 'Unknown';
  const ageBins = ageSettings.all;
  for (const bin of ageBins) {
    if (age >= parseInt(bin.start) && age < parseInt(bin.end)) {
      return `${bin.start}-${bin.end}`;
    }
  }
  return 'Unknown';
};

const getTimeRangeFilter = (timeRange, startDate) => {
  const now = new Date();
  const timeRanges = {
    '1day': 1,
    '1week': 7,
    '1month': 30,
    '3months': 90,
    'custom': null
  };

  if (timeRange === 'custom') {
    return startDate ? new Date(startDate).toISOString() : null;
  }

  const days = timeRanges[timeRange] || 1;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
};

const getFirstWord = (address) => {
  return (address || "Unknown").split(',')[0].trim();
};

const LocationVsAge = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [state, setState] = useState(initialState);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch age settings
      const { data: hospitalData, error: hospitalError } = await supabase
        .from('hospitals')
        .select('age_settings')
        .eq('hospital_id', hospitalId)
        .single();

      if (hospitalError) throw new Error('Failed to fetch hospital settings');

      let ageSettings;
      try {
        ageSettings = typeof hospitalData.age_settings === 'string' 
          ? JSON.parse(hospitalData.age_settings)
          : hospitalData.age_settings;
          
        if (!ageSettings?.all?.length) {
          throw new Error('Invalid age settings format');
        }
      } catch (parseError) {
        throw new Error('Invalid age settings data structure');
      }

      const ageGroups = ageSettings.all.map(bin => `${bin.start}-${bin.end}`);

      // Fetch patient data
      let query = supabase
        .from('appointments')
        .select(`
          patients!inner(
            address,
            date_of_birth
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
        const timeFilter = getTimeRangeFilter(timeRange, startDate);
        if (timeFilter) {
          query = query.gte('appointment_time', timeFilter);
        }
      }

      const { data, error } = await query;

      if (error) throw new Error('Failed to fetch appointment data');

      // Process locations and create frequency map
      const locationFrequency = {};
      data.forEach(appointment => {
        const location = getFirstWord(appointment.patients.address);
        locationFrequency[location] = (locationFrequency[location] || 0) + 1;
      });

      // Sort locations by frequency and get top 5
      const sortedLocations = Object.entries(locationFrequency)
        .sort(([, a], [, b]) => b - a)
        .map(([location]) => location);

      const top5Locations = sortedLocations.slice(0, 5);

      const matrix = {};
      const breakdown = {};
      const totals = {};
      let totalCount = 0;

      // Initialize data structures for all locations
      sortedLocations.forEach(location => {
        matrix[location] = {};
        breakdown[location] = {};
        totals[location] = 0;
      });

      // Process the data
      data.forEach(appointment => {
        const location = getFirstWord(appointment.patients.address);
        const age = calculateAge(appointment.patients.date_of_birth);
        const ageGroup = getAgeGroup(age, ageSettings);

        if (!matrix[location][ageGroup]) matrix[location][ageGroup] = 0;
        if (!breakdown[location][ageGroup]) breakdown[location][ageGroup] = 0;
        
        matrix[location][ageGroup]++;
        breakdown[location][ageGroup]++;
        totals[location]++;
        totalCount++;
      });

      // Create heatmap arrays for top 5 and all locations
      const top5HeatmapArray = top5Locations.map(location =>
        ageGroups.map(ageGroup => matrix[location]?.[ageGroup] || 0)
      );

      const allLocationsHeatmapArray = sortedLocations.map(location =>
        ageGroups.map(ageGroup => matrix[location]?.[ageGroup] || 0)
      );

      setState(prev => ({
        ...prev,
        heatmapData: top5HeatmapArray,
        ageGroups,
        locations: top5Locations,
        locationBreakdown: breakdown,
        locationTotals: totals,
        totalPatients: totalCount,
        ageSettings,
        isLoading: false,
        allLocationsData: {
          heatmapData: allLocationsHeatmapArray,
          locations: sortedLocations
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formattedData = useMemo(() => 
    state.heatmapData?.map((row) =>
      row.map((value) => (state.showPercentage ? ((value / state.totalPatients) * 100).toFixed(2) : value))
    ) || [], 
    [state.heatmapData, state.showPercentage, state.totalPatients]
  );

  const maxValue = useMemo(() => 
    Math.max(1, ...(state.heatmapData?.flat() || [1])),
    [state.heatmapData]
  );

  const renderBreakdown = useCallback((location, total) => {
    if (!state.locationBreakdown[location]) return null;
    
    return Object.entries(state.locationBreakdown[location])
      .sort(([, a], [, b]) => b - a)
      .map(([ageGroup, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${location}-${ageGroup}`}>
            {percentage}% of {location} are in age group {ageGroup}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  }, [state.locationBreakdown]);

  if (state.isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Age vs Location</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (state.error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Age vs Location</WidgetTitle>
        <ErrorMessage>Error: {state.error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer>
      <WidgetTitle>
        Age vs Location (Top 5)
        <div>
          <Switch
            onChange={() => setState(prev => ({ ...prev, showPercentage: !prev.showPercentage }))}
            checked={state.showPercentage}
            offColor="#888"
            onColor="#66ff66"
            uncheckedIcon={false}
            checkedIcon={false}
            aria-label="Toggle percentage display"
          />
          <ShowAllButton onClick={() => setState(prev => ({ ...prev, showAllModal: true }))}>
            Show All
          </ShowAllButton>
        </div>
      </WidgetTitle>

      <HeatmapContainer>
        <HeatMapGrid
          data={formattedData}
          xLabels={state.ageGroups}
          yLabels={state.locations}
          cellRender={(x, y, value) => (
            <CellContainer>
              <div>{value}{state.showPercentage ? '%' : ''}</div>
              <Tooltip className="tooltip">
                {state.locations[y]}, Age: {state.ageGroups[x]}
                <br />
                Value: {value}{state.showPercentage ? '%' : ''}
              </Tooltip>
            </CellContainer>
          )}
          xLabelsStyle={() => ({
            color: '#ffffff',
            fontSize: '0.8rem',
          })}
          yLabelsStyle={() => ({
            fontSize: '0.8rem',
            color: '#ffffff',
            marginRight: '15px',
          })}
          cellStyle={(x, y) => {
            const rawValue = state.heatmapData[x]?.[y] || 0;
            const value = state.showPercentage 
              ? (rawValue / state.totalPatients) * 100 
              : rawValue;
            const maxVal = state.showPercentage 
              ? (maxValue / state.totalPatients) * 100 
              : maxValue;
            const intensity = maxVal > 0 ? value / maxVal : 0;
            
            return {
              background: intensity === 0
                ? 'rgba(0, 128, 255, 0.1)'
                : `rgba(0, 128, 255, ${0.2 + (intensity * 0.8)})`,
              fontSize: '0.9rem',
              color: intensity > 0.5 ? '#ffffff' : '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
              position: 'relative',
              '&:hover': {
                opacity: 0.8,
              }
            };
          }}
          cellHeight="5.5rem"
          xLabelsPos="top"
          yLabelsPos="left"
          yLabelsRender={(label) => (
            <YLabelContainer>
              {label}
            </YLabelContainer>
          )}
          square
        />
      </HeatmapContainer>

      <BreakdownContainer>
        {state.locations.map(location => (
          <LocationSection key={location}>
            <LocationTitle>{location} Age Distribution</LocationTitle>
            {renderBreakdown(location, state.locationTotals[location])}
          </LocationSection>
        ))}
      </BreakdownContainer>

      {state.showAllModal && (
        <Modal>
          <ModalContent>
            <CloseButton onClick={() => setState(prev => ({ ...prev, showAllModal: false }))}>
              ×
            </CloseButton>
            <h2 style={{ marginBottom: '20px' }}>All Locations Age Distribution</h2>
            <HeatMapGrid
              data={state.allLocationsData.heatmapData}
              xLabels={state.ageGroups}
              yLabels={state.allLocationsData.locations}
              cellRender={(x, y, value) => (
                <CellContainer>
                  <div>{state.showPercentage 
                    ? ((value / state.totalPatients) * 100).toFixed(2) + '%'
                    : value}
                  </div>
                </CellContainer>
              )}
              // ... (same styling properties as main heatmap)
            />
            <BreakdownContainer>
              {state.allLocationsData.locations.map(location => (
                <LocationSection key={location}>
                  <LocationTitle>{location} Age Distribution</LocationTitle>
                  {renderBreakdown(location, state.locationTotals[location])}
                </LocationSection>
              ))}
            </BreakdownContainer>
          </ModalContent>
        </Modal>
      )}
    </WidgetContainer>
  );
};

LocationVsAge.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.oneOf(['1day', '1week', '1month', '3months', 'custom']).isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

LocationVsAge.defaultProps = {
  startDate: null,
  endDate: null
};

export default LocationVsAge;