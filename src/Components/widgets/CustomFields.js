import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import styled from 'styled-components';
import { supabase } from '../../supabaseClient';
import Switch from 'react-switch';
import dayjs from 'dayjs';

// Define filter options
const filterOptions = [
  { label: 'Location', value: 'location' },
  { label: 'Age', value: 'age' },
  { label: 'Gender', value: 'gender' },
  { label: 'Distance Traveled', value: 'distance' },
  { label: 'Discovery Channel', value: 'discoveryChannel' },
  { label: 'Day of the Week', value: 'day_of_week' },
  { label: 'Weekday/Weekend', value: 'weekdayWeekend' },
  { label: 'appointment_type (Walkin/Appointment/Emergency)', value: 'appointment_type' },
];

// Styled components

const WidgetContainer = styled.div`
  background-color: #2c2f33;
  padding: 20px;
  border-radius: 15px;
  color: #fff;
  width: 300px; 
  height: auto; 
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-top: 20px
`;

const WidgetTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const ChartContainer = styled.div`
  flex-grow: 1;
  width: 100%;
  height: 100%; /* Make the chart take up the full height */
`;

const Container = styled.div`
  margin-top: 20px;
  color: #ffffff;
  display: flex;
  justify-content: space-between;
`;
const FieldsContainer = styled.div`
  flex: 1;
`;

const FieldContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
`;

const Dropdown = styled.select`
  padding: 5px;
  background-color: #333333;
  color: #ffffff;
  border: 1px solid #444444;
  border-radius: 5px;
`;

const Input = styled.input`
  padding: 5px;
  background-color: #333333;
  color: #ffffff;
  border: 1px solid #444444;
  border-radius: 5px;
`;

const Button = styled.button`
  padding: 5px 10px;
  background-color: #007bff;
  color: #ffffff;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #555555;
    cursor: not-allowed;
  }
`;

const ComparisonContainer = styled.div`
  flex: 0.3;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

// Define your CustomFields component
const CustomFields = ({ hospitalId,selectedDoctorId, selectedRange, setSelectedRange,startDate, endDate,width,height }) => {
  
  const [fields, setFields] = useState([]);
  const [comparisonField, setComparisonField] = useState('none');
  const [data, setData] = useState([]); // Data fetched from Supabase
  const [locations, setLocations] = useState(['All']); // State for unique locations
  const [showPercentage, setShowPercentage] = useState(true);
  const [patientData, setPatientData] = useState([
  ]);
  const [loading, setLoading] = useState(true);
  // Function to fetch unique locations from the database
  const fetchUniqueLocations = async () => {
    const { data:locationsData, error } = await supabase.rpc('get_distinct_main_area', {        
      hospital_id_input:hospitalId, 
    });
    
 // Ensure distinct values
    console.log('selected range',selectedRange);
    if (error) {
      console.error('Error fetching locations:', error);
      return;
    }    
    const uniqueLocations = locationsData.map((item) => item.main_area);
    
    setLocations(['All', ...uniqueLocations]);
  };

  // Fetch unique locations on component mount
  useEffect(() => {
    fetchUniqueLocations();
  }, []);


  const addField = () => {
    setFields([...fields, { id: fields.length, name: '', value: '', rangeStart: '', rangeEnd: '' }]);
    console.log('The set fields are',fields);
  };

  const removeField = (id) => {
    setFields(fields.filter((field) => field.id !== id));
    console.log('The removed  fields are',fields);
  };

  const searchResult = async (selectedFields)  => {
    
    try {
      console.log('search function called with value:', selectedFields);
      //age_max - for between rangeend and for above rangeend
      const selectedAgeRange = selectedFields.find((ele) => ele.name === 'age');
      const max_age = (selectedAgeRange?.value === 'between' || selectedAgeRange?.value === 'below') ? selectedAgeRange?.rangeEnd : null;
      const min_age = (selectedAgeRange?.value === 'between' || selectedAgeRange?.value === 'above') ? selectedAgeRange?.rangeStart : null;
      console.log('day of week',selectedFields.find((ele) => ele.name === "day_of_week")?.value ?? null);
      
      const { data, error } = await supabase.rpc('dynamic_patient_count', {        
        p_location: selectedFields.find((ele) => ele.name === 'location')?.value || null,
        p_hospital_id:hospitalId, 
        p_discovery_channel: selectedFields.find((ele) => ele.name === "discoveryChannel")?.value ?? null,
        p_age_min: min_age ?? null,
        p_age_max:max_age ?? null,
        p_doctor_id:selectedDoctorId,
        p_day_of_week:selectedFields.find((ele) => ele.name === "day_of_week")?.value ?? null,
        p_start_date:startDate,
        p_end_date:endDate,
        p_gender:selectedFields.find((ele) => ele.name === "gender")?.value ?? null,
        p_type: selectedFields.find((ele) => ele.name === "appointment_type")?.value ?? null,
        p_time_range:selectedRange,
        p_day_of_week:selectedFields.find((ele) => ele.name === "weekdayWeekend")?.value ?? null
      });
  
      if (error) {
        console.error('Error calling dynamic_patient_count:', error);
        setData([]); // Clear data if error occurs
        return;
      }
      setData(data);
    } catch (err) {
      console.error('Error fetching filtered data:', err);
    }
  }

  const handleFieldChange = (id, name, value) => {
   
    const newFields = fields.map((field) => {

      if (field.id === id) {
        return { ...field, name: name || field.name, value: value ?? field.value };
      }
      return field;
    });
    setFields(newFields);
    console.log(`dropdown name :${name} and value : ${value}`);
    console.log('fields values Changed:', fields);
  };

  const handleInputChange = (id, key, value) => {
    const newFields = fields.map((field) => {
      if (field.id === id) {
        return { ...field, [key]: value };
      }
      return field;
    });
    setFields(newFields);
  };

  const fetchPatientComparison = async () => {
    setLoading(true); // Start loading

    setPatientData([]);
   
    try {
      // Replace 'hospital_id' and '1_month' with your actual parameters
 
      console.log(comparisonField == "discoveryChannel" ? 'how_did_you_get_to_know_us': comparisonField === "location" ? 'main_area' : comparisonField);
      const selectedAgeRange = fields.find((ele) => ele.name === 'age');
      const max_age = (selectedAgeRange?.value === 'between' || selectedAgeRange?.value === 'above') ? selectedAgeRange?.rangeEnd : null;
      const min_age = (selectedAgeRange?.value === 'between' || selectedAgeRange?.value === 'below') ? selectedAgeRange?.rangeStart : null;
      const { data, error } = await supabase.rpc('patient_discovery_count_dynamic', {
        p_group_by:comparisonField == "discoveryChannel" ? 'how_did_you_get_to_know_us': comparisonField === "location" ? 'main_area' : comparisonField === "weekdayWeekend" ? 'day_of_week' :comparisonField,
        p_secondary_group_by:comparisonField == "discoveryChannel" ? 'how_did_you_get_to_know_us': comparisonField === "location" ? 'main_area' : comparisonField=== "weekdayWeekend" ? 'day_of_week' :comparisonField,//fields.find((item) => item.name === 'location') ? "main_area" : null,
        p_start_date: startDate, // Use actual UUID
        p_end_date: endDate,
        p_gender:fields.find((item) => item.name === 'gender')?.value|| null,
        p_address: fields.find((item) => item.name === 'location')?.value|| null,
        p_min_age:min_age,
        p_max_age:max_age,
        p_discovery:fields.find((item) => item.name === 'discoveryChannel')?.value|| null,
        p_time_range:selectedRange,
        p_hospital_id :hospitalId,
        p_doctor_id:selectedDoctorId
      });


      if (error) {
        console.error('Error fetching patient growth stats:', error.message);
        setLoading(false); // Stop loading in case of error
        return;
      }
      
      const formattedData = data.reduce((acc, item) => {
        console.log(`"${item.group_value}"`);
        acc[`ageRange${item.group_value.replace("-","_")}`] = item.count;
        return acc;
      }, {});
      
      setPatientData(formattedData);
      setLoading(false); // Stop loading after data is set
    } catch (err) {
      console.error('Fetch error:', err);
      setLoading(false); // Stop loading in case of error
    }
  };
  useEffect(() => {
    if (comparisonField !== 'none' && fields.length > 0) {
      fetchPatientComparison(comparisonField, fields);
    } // Fetch data on component mount
  }, [comparisonField,selectedRange,startDate,endDate]);
  
  const isWeekdayComparison = comparisonField === "weekdayWeekend";
  const labels = isWeekdayComparison
  ? ['Weekend', 'Weekday']:
  Object.keys(patientData).map(label => 
    label.replace('ageRange', '').replace('_', '-')
  );

  const total = Object.values(patientData).reduce((acc, count) => acc + count, 0);

  const weekendCount = isWeekdayComparison
  ? Object.keys(patientData).reduce((acc, day) => {
      if (['ageRangeSaturday', 'ageRangeSunday'].includes(day.trim())) {
        return acc + patientData[day];
      }
      return acc;
    }, 0)
  : 0;
    console.log('weekendcount',weekendCount);
  const weekdayCount = isWeekdayComparison
  ? Object.keys(patientData).reduce((acc, day) => {
      if (!['ageRangeSaturday', 'ageRangeSunday'].includes(day.trim())) {
        return acc + patientData[day];
      }
      return acc;
    }, 0)
  : 0;

  const dataValues = isWeekdayComparison
  ? [weekendCount, weekdayCount]
  : Object.values(patientData);
 
  const patientdata = {
    
    labels: labels, // Use age ranges as labels
    datasets: [
      {
        label: showPercentage ? 'Percentage' : 'Number of Patients',
        data: showPercentage
        ? dataValues.map(count => ((count / total) * 100).toFixed(2)) // Convert values to percentages if needed
        : dataValues, // Use raw counts when not showing percentages
        backgroundColor: [ '#4285F4'], // Adjust the colors if needed
        borderRadius: 5,
        barThickness: 30,
      },
    ],
  };
  
  const options = {
    indexAxis: 'x', // This makes the bar chart vertical
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#ffffff', // X-axis label color
          beginAtZero: true,
          callback: function (value, index) {
            const labels = isWeekdayComparison
            ? ['Weekend', 'Weekday']:
            Object.keys(patientData).map(label => 
            label.replace('ageRange', '').replace('_', '-')
              );
            return showPercentage ? labels[index] : labels[index]; 
          },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#ffffff', // Y-axis label color
          padding: 10, // Adds padding to avoid label cutoff
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true, // Enable the default tooltip
        callbacks: {
          label: function (tooltipItem) {
            return showPercentage
              ? `${tooltipItem.raw}%`
              : tooltipItem.raw;
          },
        },
      },
      datalabels: {
        display: true,
        color: '#ffffff', // White color for the data labels
        anchor: 'end',
        align: 'top',
        offset: 0,
        formatter: (value) => {
          return showPercentage ? `${value}%` : value;
        },
      },
    },
  };

  const handleComparisonChange = (e) => {
    setComparisonField(e.target.value);
  };


  const availableOptions = filterOptions.filter(
    (option) =>
      !fields.some((field) => field.name === option.value) 
  );

  const availableComparisonOptions = filterOptions.filter(
    (option) =>
      !fields.some((field) => field.name === option.value) 
  );


  const renderFieldValue = (field) => {
    switch (field.name) {
      case 'location':
        return (
          <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </Dropdown>
        );
      case 'age':
        return (
          <>
            <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
              <option value="all">All</option>
              <option value="between">Between</option>
              <option value="below">Below</option>
              <option value="above">Above</option>
            </Dropdown>
            {(field.value === 'between' || field.value === 'below' ) && (
              <Input
                type="number"
                placeholder="Enter age"
                value={field.rangeStart || ''}
                onChange={(e) => handleInputChange(field.id, 'rangeStart', e.target.value)}
              />
            )}
            {(field.value === 'between'|| field.value === 'above') && (
              <Input
                type="number"
                placeholder="End age"
                value={field.rangeEnd || ''}
                onChange={(e) => handleInputChange(field.id, 'rangeEnd', e.target.value)}
              />
            )}
          </>
        );
      case 'gender':
        return (
          <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
            <option value="all">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Dropdown>
        );
      case 'distance':
        return (
          <>
            <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
              <option value="all">All</option>
              <option value="between">Between</option>
              <option value="below">Below</option>
              <option value="above">Above</option>
            </Dropdown>
            {(field.value === 'between' || field.value === 'below' || field.value === 'above') && (
              <Input
                type="number"
                placeholder="Enter distance"
                value={field.rangeStart || ''}
                onChange={(e) => handleInputChange(field.id, 'rangeStart', e.target.value)}
              />
            )}
            {field.value === 'between' && (
              <Input
                type="number"
                placeholder="End distance"
                value={field.rangeEnd || ''}
                onChange={(e) => handleInputChange(field.id, 'rangeEnd', e.target.value)}
              />
            )}
          </>
        );
      case 'discoveryChannel':
        return (
          <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
            <option value="all">All</option>
            <option value="FriendsFamily">Friends and Family</option>
            <option value="Google">Google</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="others">Others</option>
          </Dropdown>
        );
      case 'appointment_type':
        return (
          <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
            <option value="all">All</option>
            <option value="Walk-in">Walkin</option>
            <option value="Booking">Booking</option>
            <option value="Emergency">Emergency</option>
          </Dropdown>
        );
      case 'weekdayWeekend':
        return (
          <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
            <option value="all">All</option>
            <option value="weekday">Weekday</option>
            <option value="weekend">Weekend</option>
          </Dropdown>
        );
      case 'day_of_week':
        return (
          <Dropdown value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)}>
            <option value="all">All</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </Dropdown>
        );
      default:
        return <Input type="text" value={field.value} onChange={(e) => handleFieldChange(field.id, field.name, e.target.value)} />;
    }
  };

  return (
    <Container>
      <FieldsContainer>
        <Button onClick={addField} disabled={availableOptions.length === 0}>
          Add Field
        </Button>
        {fields.map((field) => (
          <FieldContainer key={field.id}>
            <Dropdown
              value={field.name}
              onChange={(e) => handleFieldChange(field.id, e.target.value, '')} // Update the name and reset the value
            >
              <option value="">Select Field</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Dropdown>

            {renderFieldValue(field)}

            <Button onClick={() => removeField(field.id)}>Remove</Button>
            
          </FieldContainer>
        ))}
        <Button onClick={()=>searchResult(fields)}>Search</Button>

        <h3>Fetched Data:</h3>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </FieldsContainer>

      <ComparisonContainer>
        <h3>Comparison</h3>
        <Dropdown value={comparisonField} onChange={handleComparisonChange}>
          <option value="none">None</option>
          {availableComparisonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Dropdown>
        {comparisonField !== 'none' && (
            <WidgetContainer >
              <WidgetTitle>
              {comparisonField} vs count 
              <div>
            <Switch
            onChange={() => setShowPercentage(!showPercentage)}
            checked={showPercentage}
            offColor="#888"
            onColor="#4285F4" // Red color for toggle, matching Discovery Widget
            uncheckedIcon={false}
            checkedIcon={false}
            height={20} /* Adjust the height of the toggle */
            width={40} /* Adjust the width of the toggle */
            />
        </div>
           </WidgetTitle>
           <ChartContainer>
            <Bar data={patientdata} options={options}/>
          </ChartContainer>
          </WidgetContainer>
      )}
      </ComparisonContainer>

    </Container>
  );
};

export default CustomFields;