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

const GenderVsDay = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [showPercentage, setShowPercentage] = useState(true);
  const [heatmapData, setHeatmapData] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [genders] = useState(['Male', 'Female']);
  const [daysOfWeek] = useState(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
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
            gender
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

      const matrix = {
        male: daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: 0 }), {}),
        female: daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: 0 }), {})
      };

      const breakdown = {
        male: { ...matrix.male },
        female: { ...matrix.female }
      };

      const totals = { male: 0, female: 0 };
      let totalCount = 0;

      data.forEach(appointment => {
        if (!appointment.patients || !appointment.patients.gender) return;

        const gender = appointment.patients.gender.toLowerCase();
        const date = new Date(appointment.appointment_time);
        const dayOfWeek = daysOfWeek[date.getDay()];

        if (gender !== 'male' && gender !== 'female') return;

        matrix[gender][dayOfWeek]++;
        breakdown[gender][dayOfWeek]++;
        totals[gender]++;
        totalCount++;
      });

      setGenderBreakdown(breakdown);
      setGenderTotals(totals);

      const heatmapArray = ['Male', 'Female'].map(gender =>
        daysOfWeek.map(day => matrix[gender.toLowerCase()][day] || 0)
      );

      setHeatmapData(heatmapArray);
      setTotalPatients(totalCount);

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
        <WidgetTitle>Gender vs Day of Week</WidgetTitle>
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetTitle>Gender vs Day of Week</WidgetTitle>
        <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>
          Error: {error}
        </div>
      </WidgetContainer>
    );
  }

  const formattedData = heatmapData.map((row, genderIndex) =>
    row.map((value) => {
      if (showPercentage) {
        const gender = genders[genderIndex].toLowerCase();
        const genderTotal = genderTotals[gender] || 0;
        return genderTotal > 0 ? ((value / genderTotal) * 100).toFixed(2) : '0.00';
      }
      return value;
    })
  );

  const maxValue = showPercentage 
    ? Math.max(...formattedData.flat().map(v => parseFloat(v)))
    : Math.max(...heatmapData.flat());

  const renderBreakdown = (gender, total) => {
    const genderLower = gender.toLowerCase();
    if (!genderBreakdown[genderLower]) return null;

    return Object.entries(genderBreakdown[genderLower])
      .sort(([, a], [, b]) => b - a)
      .map(([day, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        return (
          <BreakdownItem key={`${gender}-${day}`}>
            {percentage}% of {gender}s visit on {day}
            <PercentageBar percentage={percentage} />
          </BreakdownItem>
        );
      });
  };

  return (
    <WidgetContainer>
      <WidgetTitle>
        Gender vs Day of Week
        <Switch
          onChange={() => setShowPercentage(!showPercentage)}
          checked={showPercentage}
          offColor="#888"
          onColor="#66ff66"
          uncheckedIcon={false}
          checkedIcon={false}
        />
      </WidgetTitle>
      <HeatmapContainer>
        <HeatMapGrid
          data={formattedData}
          xLabels={daysOfWeek}
          yLabels={genders}
          cellRender={(x, y, value) => {
            const rawValue = heatmapData[y]?.[x] || 0;
            return (
              <div style={{ fontSize: '12px', color: 'white' }}>
                {showPercentage ? `${value}%` : value}
                <br />
                ({rawValue})
              </div>
            );
          }}
          cellStyle={(_x, _y, value) => {
            const normalizedValue = (parseFloat(value) / maxValue) || 0;
            const intensity = Math.pow(normalizedValue, 0.5);
            
            const red = Math.round(128 + (intensity * 127));
            const green = Math.round(0 + (1 - intensity) * 50);
            const blue = Math.round(128 + (intensity * 127));
            const alpha = 0.2 + (intensity * 0.8);

            return {
              background: `rgba(${red}, ${green}, ${blue}, ${alpha})`,
              fontSize: '15px',
              color: intensity > 0.7 ? '#ffffff' : '#ffffff',
              border: '1px solid #2a2a2a',
              transition: 'all 0.3s ease'
            };
          }}
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
      </HeatmapContainer>
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
    </WidgetContainer>
  );
};

GenderVsDay.propTypes = {
  hospitalId: PropTypes.string.isRequired,
  doctorId: PropTypes.string.isRequired,
  timeRange: PropTypes.string.isRequired,
  startDate: PropTypes.string,
  endDate: PropTypes.string
};

export default GenderVsDay;