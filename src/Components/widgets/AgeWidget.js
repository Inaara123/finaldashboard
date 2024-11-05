import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AgeWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [loading, setLoading] = useState(true);
  const [ageCounts, setAgeCounts] = useState([]);
  const [editingBin, setEditingBin] = useState(null);
  const [showPercentages, setShowPercentages] = useState(false);
  
  const defaultAgeBins = [
    { id: 'bin-1', start: '<', end: '20', count: 0 },
    { id: 'bin-2', start: '20', end: '25', count: 0 },
    { id: 'bin-3', start: '25', end: '30', count: 0 },
    { id: 'bin-4', start: '30', end: '35', count: 0 },
    { id: 'bin-5', start: '35', end: '40', count: 0 },
    { id: 'bin-6', start: '40', end: '45', count: 0 },
    { id: 'bin-7', start: '45', end: '50', count: 0 },
    { id: 'bin-8', start: '50', end: '>', count: 0 }
  ];

  const [ageBins, setAgeBins] = useState(defaultAgeBins);
  const [tempBins, setTempBins] = useState(defaultAgeBins);
  const [showUpdateButton, setShowUpdateButton] = useState(false);
  
  const colors = [
    '#2C3E50', '#E74C3C', '#8E44AD', '#16A085',
    '#D35400', '#2980B9', '#C0392B', '#7D3C98'
  ];

  const sortBins = (bins) => {
    return [...bins].sort((a, b) => {
      // Handle special cases first
      if (a.start === '<') return -1;
      if (b.start === '<') return 1;
      if (a.end === '>') return 1;
      if (b.end === '>') return -1;
      
      // Compare start values for normal cases
      return parseFloat(a.start) - parseFloat(b.start);
    });
  };

  const getTimeRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let currentStart, currentEnd;
    
    switch (timeRange) {
      case '1day':
        currentStart = today;
        currentEnd = now;
        break;
      case '1week':
        currentStart = new Date(today);
        currentStart.setDate(currentStart.getDate() - 7);
        currentEnd = now;
        break;
      case '1month':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 1);
        currentEnd = now;
        break;
      case '3months':
        currentStart = new Date(today);
        currentStart.setMonth(currentStart.getMonth() - 3);
        currentEnd = now;
        break;
      case 'custom':
        currentStart = new Date(startDate);
        currentEnd = new Date(endDate);
        break;
      default:
        currentStart = today;
        currentEnd = now;
    }
    
    return { currentStart, currentEnd };
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    
    const diffMs = today - birth;
    const ageDate = new Date(diffMs);
    
    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
    
    if (years === 0) {
      const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
      return months / 12;
    }
    
    return years;
  };

  const getAgeBucket = (age) => {
    if (age === null) return 'Unknown';
    
    const sortedBins = [...ageBins].sort((a, b) => {
      const rangeA = (a.end === '>' ? 100 : parseFloat(a.end)) - (a.start === '<' ? 0 : parseFloat(a.start));
      const rangeB = (b.end === '>' ? 100 : parseFloat(b.end)) - (b.start === '<' ? 0 : parseFloat(b.start));
      return rangeA - rangeB;
    });
  
    const matches = sortedBins.filter(bin => {
      const start = bin.start === '<' ? -Infinity : parseFloat(bin.start);
      const end = bin.end === '>' ? Infinity : parseFloat(bin.end);
      
      if (bin.start === '<' && age < end) return true;
      if (bin.end === '>' && age >= start) return true;
      return age >= start && age < end;
    });
  
    return matches.map(bin => {
      if (bin.start === '<') return `${bin.start}${bin.end}`;
      if (bin.end === '>') return `${bin.start}${bin.end}`;
      return `${bin.start}-${bin.end}`;
    });
  };

  const fetchAgeSettings = async () => {
    if (!hospitalId) return;
    
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('age_settings')
        .eq('hospital_id', hospitalId)
        .single();

      if (error) throw error;

      if (data?.age_settings) {
        const settings = data.age_settings[doctorId] || data.age_settings['all'] || defaultAgeBins;
        const binsWithIds = settings.map((bin, index) => ({
          ...bin,
          id: bin.id && bin.id.startsWith('bin-') ? bin.id : `bin-${index + 1}`
        }));
        const sortedBins = sortBins(binsWithIds);
        setAgeBins(sortedBins);
        setTempBins(sortedBins);
      } else {
        const sortedDefaultBins = sortBins(defaultAgeBins);
        setAgeBins(sortedDefaultBins);
        setTempBins(sortedDefaultBins);
      }
    } catch (error) {
      console.error('Error fetching age settings:', error);
    }
  };

  const saveAgeSettings = async () => {
    if (!hospitalId) return;
    
    try {
      const { data: currentSettings, error: fetchError } = await supabase
        .from('hospitals')
        .select('age_settings')
        .eq('hospital_id', hospitalId)
        .single();

      if (fetchError) throw fetchError;

      const sortedBins = sortBins(tempBins);
      const updatedSettings = {
        ...(currentSettings?.age_settings || {}),
        [doctorId === 'all' ? 'all' : doctorId]: sortedBins
      };

      const { error: updateError } = await supabase
        .from('hospitals')
        .update({ age_settings: updatedSettings })
        .eq('hospital_id', hospitalId);

      if (updateError) throw updateError;

      setAgeBins(sortedBins);
      setTempBins(sortedBins);
      setShowUpdateButton(false);
      await fetchAgeData();
    } catch (error) {
      console.error('Error saving age settings:', error);
    }
  };

  const fetchAgeData = async () => {
    if (!hospitalId || !doctorId) return;
    
    try {
      setLoading(true);
      const { currentStart, currentEnd } = getTimeRanges();
      
      const query = supabase
        .from('appointments')
        .select(`
          appointment_id,
          patient_id,
          patients (
            date_of_birth
          )
        `)
        .eq('hospital_id', hospitalId)
        .gte('appointment_time', currentStart.toISOString())
        .lte('appointment_time', currentEnd.toISOString());
  
      if (doctorId !== 'all') {
        query.eq('doctor_id', doctorId);
      }
  
      const { data, error } = await query;
      
      if (error) throw error;
  
      const ageGroups = {};
      data.forEach(appointment => {
        if (!appointment.patients?.date_of_birth) return;
        
        const age = calculateAge(appointment.patients.date_of_birth);
        const matchingBuckets = getAgeBucket(age);
        
        matchingBuckets.forEach(bucket => {
          ageGroups[bucket] = (ageGroups[bucket] || 0) + 1;
        });
      });
  
      const sortedAgeGroups = ageBins.map(bin => {
        const range = bin.start === '<' ? `${bin.start}${bin.end}` :
                     bin.end === '>' ? `${bin.start}${bin.end}` :
                     `${bin.start}-${bin.end}`;
        return {
          range,
          count: ageGroups[range] || 0
        };
      });
  
      setAgeCounts(sortedAgeGroups);
    } catch (error) {
      console.error('Error fetching age data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewBar = () => {
    const maxId = tempBins.reduce((max, bin) => {
      const id = parseInt(bin.id.replace('bin-', ''));
      return isNaN(id) ? max : Math.max(max, id);
    }, 0);
    const newId = `bin-${maxId + 1}`;
    const newBin = { id: newId, start: '0', end: '10', count: 0 };
    const newBins = sortBins([...tempBins, newBin]);
    setTempBins(newBins);
    setShowUpdateButton(true);
  };

  const deleteBar = (index) => {
    const newBins = tempBins.filter((_, i) => i !== index);
    setTempBins(newBins);
    setShowUpdateButton(true);
  };

  const handleBinChange = (index, field, value) => {
    const newBins = [...tempBins];
    newBins[index][field] = value;
    const sortedBins = sortBins(newBins);
    setTempBins(sortedBins);
    setShowUpdateButton(true);
    setEditingBin(null);
  };

  const calculatePercentages = (counts) => {
    const total = counts.reduce((sum, group) => sum + group.count, 0);
    return counts.map(group => ({
      ...group,
      percentage: total > 0 ? ((group.count / total) * 100).toFixed(1) : '0'
    }));
  };

  useEffect(() => {
    if (hospitalId && doctorId) {
      fetchAgeSettings();
    }
  }, [hospitalId, doctorId]);

  useEffect(() => {
    if (hospitalId && doctorId && (timeRange !== 'custom' || (startDate && endDate))) {
      fetchAgeData();
    }
  }, [hospitalId, doctorId, timeRange, startDate, endDate, ageBins]);

  const maxCount = Math.max(...ageCounts.map(g => g.count), 1);
  const barWidth = 60;
  const spacing = 20;
  const totalWidth = Math.max((barWidth + spacing) * ageCounts.length, 300);

  const displayCounts = showPercentages ? calculatePercentages(ageCounts) : ageCounts;

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      border: '1px solid #333',
      display: 'inline-block',
      width: `${Math.max(600, (tempBins.length * (barWidth + spacing)) + 100)}px`,
      height: 'fit-content',
      marginTop: '20px',
      position: 'relative'
    }}>
      <div style={{ 
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <button
          onClick={addNewBar}
          style={{
            padding: '6px 12px',
            backgroundColor: '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Age Group
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fff' }}>
          Show %
          <input
            type="checkbox"
            checked={showPercentages}
            onChange={(e) => setShowPercentages(e.target.checked)}
          />
        </label>
      </div>

      <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>Age Distribution</h3>
      
      {loading ? (
        <div style={{ color: '#fff' }}>Loading...</div>
      ) : (
        <div>
          <div style={{ 
            position: 'relative',
            height: '400px',
            width: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            marginBottom: '40px',
            overflowX: 'auto',
            paddingBottom: '20px'
          }}>
            {tempBins.map((bin, index) => (
              <div
                key={bin.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginRight: spacing,
                  position: 'relative'
                }}
              >
                <button
                  onClick={() => deleteBar(index)}
                  style={{
                    position: 'absolute',
                    top: '-25px',
                    right: '0',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
                <div style={{
                  width: barWidth,
                  height: `${(displayCounts[index]?.count || 0) / maxCount * 300}px`,
                  backgroundColor: colors[index % colors.length],
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  padding: '5px',
                  color: 'white',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '30px',
                  transition: 'all 0.3s ease'
                }}>
                  {showPercentages 
                    ? `${displayCounts[index]?.percentage || 0}%`
                    : displayCounts[index]?.count || 0}
                </div>
                <div style={{
                  marginTop: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: '#fff'
                }}>
                  {editingBin?.id === bin.id && editingBin?.field === 'start' ? (
                    <input
                      type="text"
                      defaultValue={bin.start}
                      onBlur={(e) => handleBinChange(index, 'start', e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleBinChange(index, 'start', e.target.value);
                        }
                      }}
                      autoFocus
                      style={{ width: '40px', background: '#333', color: '#fff', border: '1px solid #555' }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingBin({ id: bin.id, field: 'start' })}
                      style={{ cursor: 'pointer' }}
                    >
                      {bin.start}
                    </span>
                  )}
                  <span>-</span>
                  {editingBin?.id === bin.id && editingBin?.field === 'end' ? (
                    <input
                      type="text"
                      defaultValue={bin.end}
                      onBlur={(e) => handleBinChange(index, 'end', e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleBinChange(index, 'end', e.target.value);
                        }
                      }}
                      autoFocus
                      style={{ width: '40px', background: '#333', color: '#fff', border: '1px solid #555' }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingBin({ id: bin.id, field: 'end' })}
                      style={{ cursor: 'pointer' }}
                    >
                      {bin.end}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {showUpdateButton && (
            <button
              onClick={saveAgeSettings}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Save Changes
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AgeWidget;