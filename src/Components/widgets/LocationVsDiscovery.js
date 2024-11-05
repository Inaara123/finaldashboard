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
  discoveryMethods: [],
  isLoading: true,
  error: null,
  locationBreakdown: {},
  locationTotals: {},
  showAllModal: false,
  allLocationsData: null
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

const LocationVsDiscovery = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [state, setState] = useState(initialState);

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      let query = supabase
        .from('appointments')
        .select(`
          patients!inner(
            address,
            how_did_you_get_to_know_us
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
      const discoveryMethodsSet = new Set();
      
      data.forEach(appointment => {
        const location = getFirstWord(appointment.patients.address);
        locationFrequency[location] = (locationFrequency[location] || 0) + 1;
        discoveryMethodsSet.add(appointment.patients.how_did_you_get_to_know_us || 'Unknown');
      });

      const discoveryMethods = Array.from(discoveryMethodsSet);
      
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
        const discoveryMethod = appointment.patients.how_did_you_get_to_know_us || 'Unknown';

        if (!matrix[location][discoveryMethod]) matrix[location][discoveryMethod] = 0;
        if (!breakdown[location][discoveryMethod]) breakdown[location][discoveryMethod] = 0;
        
        matrix[location][discoveryMethod]++;
        breakdown[location][discoveryMethod]++;
        totals[location]++;
        totalCount++;
      });

      // Create heatmap arrays for top 5 and all locations
      const top5HeatmapArray = top5Locations.map(location =>
        discoveryMethods.map(method => matrix[location]?.[method] || 0)
      );

      setState(prev => ({
        ...prev,
        heatmapData: top5HeatmapArray,
        discoveryMethods,
        locations: top5Locations,
        locationBreakdown: breakdown,
        locationTotals: totals,
        totalPatients: totalCount,
        isLoading: false,
        allLocationsData: {
          locations: sortedLocations,
          breakdown,
          totals
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
      .map(([method, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${location}-${method}`}>
            {percentage}% of {location} discovered through {method}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  }, [state.locationBreakdown]);

  if (state.isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Location vs Discovery Method</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (state.error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Location vs Discovery Method</WidgetTitle>
        <ErrorMessage>Error: {state.error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer>
      <WidgetTitle>
        Location vs Discovery Method (Top 5)
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
          xLabels={state.discoveryMethods}
          yLabels={state.locations}
          cellRender={(x, y, value) => (
            <CellContainer>
              <div>{value}{state.showPercentage ? '%' : ''}</div>
              <Tooltip className="tooltip">
                {state.locations[y]}, Method: {state.discoveryMethods[x]}
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
            <LocationTitle>{location} Discovery Method Distribution</LocationTitle>
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
            <h2 style={{ marginBottom: '20px' }}>All Locations Discovery Method Distribution</h2>
            <BreakdownContainer>
              {state.allLocationsData.locations.map(location => (
                <LocationSection key={location}>
                  <LocationTitle>{location} Discovery Method Distribution</LocationTitle>
                  {renderBreakdown(location, state.allLocationsData.totals[location])}
                </LocationSection>
              ))}
            </BreakdownContainer>
          </ModalContent>
        </Modal>
      )}
    </WidgetContainer>
  );
};

LocationVsDiscovery.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.oneOf(['1day', '1week', '1month', '3months', 'custom']).isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

LocationVsDiscovery.defaultProps = {
  startDate: null,
  endDate: null
};

export default LocationVsDiscovery;