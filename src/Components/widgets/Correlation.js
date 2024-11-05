import React, { useState,useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styled from 'styled-components';
import CustomFields from './CustomFields'; // Import the CustomFields component
import { supabase } from '../../supabaseClient';
const Container = styled.div`
  padding: 20px;
  color: #ffffff;
  background-color: #1e1e1e;
  height: 100vh;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #ffffff;
`;

const HeaderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  margin-bottom: 20px;
`;

const Button = styled.button`
  background-color: ${(props) => (props.active ? '#ffffff' : '#333333')};
  color: ${(props) => (props.active ? '#000000' : '#ffffff')};
  border: none;
  padding: 10px 20px;
  margin: 0 5px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background-color: ${(props) => (props.active ? '#ffffff' : '#444444')};
  }
`;

const DateContainer = styled.div`
  display: ${(props) => (props.show ? 'flex' : 'none')};
  align-items: center;
  gap: 10px;
`;

const DatePickerStyled = styled(DatePicker)`
  background-color: #333333;
  color: #ffffff;
  border: none;
  padding: 10px;
  border-radius: 5px;
`;
const DoctorSelect = styled.select`
  background-color: #333333;
  color: #ffffff;
  border: none;
  padding: 10px;
  border-radius: 5px;
  font-size: 1rem;
`;
const Correlation = ({hospitalId}) => {
  const [administratorName, setAdministratorName] = useState('all');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState('single_day');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [dispname,setdispname]=useState('all');
  const fetchDoctorsData = async () => {
    const { data, error } = await supabase
      .rpc('get_administrator_and_doctors', { hospitals_id: hospitalId });

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    // Assuming that all records have the same administrator name
    if (data && data.length > 0) {
      setAdministratorName('All Doctors');
      setdispname('All Doctors');
    }

    // Map doctors from the fetched data
    const fetchedDoctors = data.map((record) => ({
      id: record.doctor_id,
      name: record.doctor_name.trim(),
    }));

    setDoctors(fetchedDoctors);
  };
  useEffect(() => {
    fetchDoctorsData();
  }, []);

  const handleDoctorChange = (e) => {
    const newValue = e.target.value;
    setSelectedDoctor(e.target.value);
    
    if (newValue === 'all') {
      // If "administrator" is selected, set selectedDoctorId to null
      setSelectedDoctorId(null);
      setdispname('All Doctors');
    } else {
      setdispname(e.target.value);
      // Find the doctor from the list by matching the selected name
      const doctor = doctors.find((doc) => doc.name === newValue);
      // Set selectedDoctorId to the found doctor's id
      setSelectedDoctorId(doctor?.id || null);
      
    }
    console.log('doctor selected',newValue);
    console.log('the doctor_id',selectedDoctorId);
  };
  const handleRangeSelect = (range) => {
    
    setSelectedRange(range);
  };

  

  return (
    <Container>
      <Title>Deeper Insights</Title>
      <HeaderBar>
      <DoctorSelect
          value={selectedDoctor}
          onChange={handleDoctorChange}
          className="dropdown-select"
        >
          <option value="all">{administratorName}</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.name}>
              {doctor.name}
            </option>
          ))}
        </DoctorSelect>
        <Button active={selectedRange === 'single_day'} onClick={() => handleRangeSelect('single_day')}>
          1 Day
        </Button>
        <Button active={selectedRange === '1_week'} onClick={() => handleRangeSelect('1_week')}>
          1 Week
        </Button>
        <Button active={selectedRange === '1_month'} onClick={() => handleRangeSelect('1_month')}>
          1 Month
        </Button>
        <Button active={selectedRange === '3_months'} onClick={() => handleRangeSelect('3_months')}>
          3 Months
        </Button>
        <Button active={selectedRange === 'custom'} onClick={() => handleRangeSelect('custom')}>
          Custom
        </Button>

        <DateContainer show={selectedRange === 'custom'}>
          <label>Start Date:</label>
          <DatePickerStyled
            selected={startDate}
            onChange={(date) => setStartDate(date)}
          />
          <label>End Date:</label>
          <DatePickerStyled
            selected={endDate}
            onChange={(date) => setEndDate(date)}
          />
        </DateContainer>
      </HeaderBar>

      <CustomFields hospitalId={hospitalId}  selectedDoctorId={selectedDoctorId} startDate={startDate} endDate={endDate} selectedRange={selectedRange} setSelectedRange={setSelectedRange}  />
    </Container>
  );
};

export default Correlation;