// src/components/widgets/CorrelationsBoard.js
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

const ErrorMessage = styled.div`
  color: #ff6b6b;
  padding: 20px;
  text-align: center;
  background-color: rgba(255, 107, 107, 0.1);
  border-radius: 8px;
  margin: 10px 0;
`;

const CorrelationsBoard = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [state, setState] = useState({
    showPercentage: true,
    heatmapData: [],
    totalPatients: 0,
    locations: ['Male', 'Female'],
    discoveryChannels: ['Google', 'Facebook', 'Instagram', 'Friends and Family', 'Other'],
    isLoading: true,
    error: null,
    genderBreakdown: { male: {}, female: {} },
    genderTotals: { male: 0, female: 0 }
  });

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

  useEffect(() => {
    let isMounted = true;

    const fetchCorrelationData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        let query = supabase
          .from('appointments')
          .select(`
            patient_id,
            patients!inner(
              gender,
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
          const timeFilter = getTimeRangeFilter();
          if (timeFilter) {
            query = query.gte('appointment_time', timeFilter);
          }
        }

        const { data, error } = await query;

        if (error) throw error;

        if (isMounted) {
          const matrix = {};
          const breakdown = { male: {}, female: {} };
          const totals = { male: 0, female: 0 };
          let totalCount = 0;
          const uniqueGenders = new Set();
          const uniqueDiscoveries = new Set();

          data.forEach(appointment => {
            const gender = appointment.patients.gender;
            const discovery = appointment.patients.how_did_you_get_to_know_us;

            uniqueGenders.add(gender);
            uniqueDiscoveries.add(discovery);

            if (!matrix[gender]) matrix[gender] = {};
            if (!matrix[gender][discovery]) matrix[gender][discovery] = 0;
            if (!breakdown[gender.toLowerCase()]) breakdown[gender.toLowerCase()] = {};
            if (!breakdown[gender.toLowerCase()][discovery]) breakdown[gender.toLowerCase()][discovery] = 0;
            
            matrix[gender][discovery]++;
            breakdown[gender.toLowerCase()][discovery]++;
            totals[gender.toLowerCase()]++;
            totalCount++;
          });

          const heatmapArray = [...uniqueGenders].map(gender =>
            [...uniqueDiscoveries].map(discovery => matrix[gender]?.[discovery] || 0)
          );

          setState(prev => ({
            ...prev,
            heatmapData: heatmapArray,
            locations: [...uniqueGenders],
            discoveryChannels: [...uniqueDiscoveries],
            genderBreakdown: breakdown,
            genderTotals: totals,
            totalPatients: totalCount,
            isLoading: false
          }));
        }
      } catch (error) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: error.message,
            isLoading: false
          }));
        }
      }
    };

    fetchCorrelationData();

    return () => {
      isMounted = false;
    };
  }, [hospitalId, doctorId, timeRange, startDate, endDate, supabase]);

  if (state.isLoading) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Discovery</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (state.error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Discovery</WidgetTitle>
        <ErrorMessage>Error: {state.error}</ErrorMessage>
      </WidgetContainer>
    );
  }

  const formattedData = state.heatmapData?.map((row) =>
    row.map((value) => (state.showPercentage ? ((value / state.totalPatients) * 100).toFixed(2) : value))
  ) || [];

  const maxValue = Math.max(...(state.heatmapData?.flat() || [0]));

  const renderBreakdown = (gender, total) => {
    if (!state.genderBreakdown[gender.toLowerCase()]) return null;
    
    return Object.entries(state.genderBreakdown[gender.toLowerCase()])
      .sort(([, a], [, b]) => b - a)
      .map(([channel, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${gender}-${channel}`}>
            {percentage}% of {gender}s discover your clinic through {channel}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Gender vs Discovery
        <Switch
          onChange={() => setState(prev => ({ ...prev, showPercentage: !prev.showPercentage }))}
          checked={state.showPercentage}
          offColor="#888"
          onColor="#66ff66"
          uncheckedIcon={false}
          checkedIcon={false}
        />
      </WidgetTitle>
      <HeatmapContainer>
        <HeatMapGrid
          data={formattedData}
          xLabels={state.discoveryChannels}
          yLabels={state.locations}
          cellRender={(x, y, value) => (
            <div title={`Gender: ${state.locations[y]}, Discovery Channel: ${state.discoveryChannels[x]} = ${value}${state.showPercentage ? '%' : ''}`}>
              {value}{state.showPercentage ? '%' : ''}
            </div>
          )}
          xLabelsStyle={() => ({
            color: '#ffffff',
            fontSize: '1rem',
          })}
          yLabelsStyle={() => ({
            fontSize: '1rem',
            color: '#ffffff',
            marginRight: '15px',
          })}
          cellStyle={(x, y) => {
            const rawValue = state.heatmapData[y]?.[x] || 0;
            const alpha = maxValue > 0 ? rawValue / maxValue : 0;
            return {
              background: `rgba(128, 0, 128, ${Math.min(Math.max(alpha, 0.1), 1)})`,
              fontSize: '0.9rem',
              color: 'white',
              border: '1px solid #ffffff',
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
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <span style={{ color: '#a5a5a5' }}>
            {state.showPercentage ? 'Showing Percentages' : 'Showing Actual Values'}
          </span>
        </div>
      </HeatmapContainer>

      <BreakdownContainer>
        <GenderSection>
          <GenderTitle>Male Distribution</GenderTitle>
          {renderBreakdown('Male', state.genderTotals.male)}
        </GenderSection>
        
        <GenderSection>
          <GenderTitle>Female Distribution</GenderTitle>
          {renderBreakdown('Female', state.genderTotals.female)}
        </GenderSection>
      </BreakdownContainer>
    </WidgetContainer>
  );
};

CorrelationsBoard.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default CorrelationsBoard;