// src/components/widgets/PatientLocationWidget.js
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../../supabaseClient';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const patientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const PatientLocationWidget = ({ hospitalId, doctorId, timeRange, startDate, endDate }) => {
  const [hospitalData, setHospitalData] = useState(null);
  const [patientLocations, setPatientLocations] = useState([]);
  const [statistics, setStatistics] = useState({
    lessThan1km: 0,
    oneToTwoKm: 0,
    twoToFiveKm: 0,
    moreThanFiveKm: 0,
    nanValues: 0,
    total: 0,
  });

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch hospital data
        const { data: hospitalData, error: hospitalError } = await supabase
          .from('hospitals')
          .select('name, location')
          .eq('hospital_id', hospitalId)
          .single();

        if (hospitalError) throw hospitalError;
        setHospitalData(hospitalData);

        // Build appointments query
        let query = supabase
          .from('appointments')
          .select('patient_id')
          .eq('hospital_id', hospitalId);

        if (doctorId !== 'all') {
          query = query.eq('doctor_id', doctorId);
        }

        // Handle time range
        const now = new Date();
        let startDateTime;
        if (timeRange === 'custom' && startDate && endDate) {
          startDateTime = new Date(startDate);
          query = query
            .gte('appointment_time', startDate)
            .lte('appointment_time', endDate);
        } else {
          switch (timeRange) {
            case '1day':
              startDateTime = new Date(now.setDate(now.getDate() - 1));
              break;
            case '1week':
              startDateTime = new Date(now.setDate(now.getDate() - 7));
              break;
            case '1month':
              startDateTime = new Date(now.setMonth(now.getMonth() - 1));
              break;
            case '3months':
              startDateTime = new Date(now.setMonth(now.getMonth() - 3));
              break;
            default:
              startDateTime = new Date(now.setDate(now.getDate() - 1));
          }
          query = query.gte('appointment_time', startDateTime.toISOString());
        }

        const { data: appointments, error: appointmentsError } = await query;
        if (appointmentsError) throw appointmentsError;

        // Fetch patient locations
        const patientIds = appointments.map(app => app.patient_id);
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
          .select('latitude, longitude')
          .in('patient_id', patientIds);

        if (patientsError) throw patientsError;

        // Calculate statistics
        const hospitalCoords = hospitalData.location.coordinates;
        const stats = {
          lessThan1km: 0,
          oneToTwoKm: 0,
          twoToFiveKm: 0,
          moreThanFiveKm: 0,
          nanValues: 0,
          total: patients.length,
        };

        const validPatientLocations = patients.filter(patient => {
          if (!patient.latitude || !patient.longitude) {
            stats.nanValues++;
            return false;
          }

          const distance = calculateDistance(
            hospitalCoords[1],
            hospitalCoords[0],
            patient.latitude,
            patient.longitude
          );

          if (distance < 1) stats.lessThan1km++;
          else if (distance < 2) stats.oneToTwoKm++;
          else if (distance < 5) stats.twoToFiveKm++;
          else stats.moreThanFiveKm++;

          return true;
        });

        setPatientLocations(validPatientLocations);
        setStatistics(stats);

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [hospitalId, doctorId, timeRange, startDate, endDate]);

  if (!hospitalData) return <div>Loading...</div>;

  const hospitalPosition = [hospitalData.location.coordinates[1], hospitalData.location.coordinates[0]];

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <h2>{hospitalData.name} - Patient Distribution</h2>
      <div style={{ height: '400px', marginBottom: '20px' }}>
        <MapContainer
          center={hospitalPosition}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Hospital Marker */}
          <Marker position={hospitalPosition} icon={hospitalIcon}>
            <Popup>{hospitalData.name}</Popup>
          </Marker>

          {/* Concentric Circles */}
          {[1, 2, 3, 4, 5].map(radius => (
            <Circle
              key={radius}
              center={hospitalPosition}
              radius={radius * 1000}
              pathOptions={{ 
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 0.1,
                weight: 1
              }}
            />
          ))}

          {/* Patient Markers */}
          {patientLocations.map((patient, index) => (
            <Marker
              key={index}
              position={[patient.latitude, patient.longitude]}
              icon={patientIcon}
            />
          ))}
        </MapContainer>
      </div>

      {/* Statistics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div>
          <h4>Less than 1km</h4>
          <p>{statistics.lessThan1km} ({((statistics.lessThan1km/statistics.total)*100).toFixed(1)}%)</p>
        </div>
        <div>
          <h4>1-2 km</h4>
          <p>{statistics.oneToTwoKm} ({((statistics.oneToTwoKm/statistics.total)*100).toFixed(1)}%)</p>
        </div>
        <div>
          <h4>2-5 km</h4>
          <p>{statistics.twoToFiveKm} ({((statistics.twoToFiveKm/statistics.total)*100).toFixed(1)}%)</p>
        </div>
        <div>
          <h4>More than 5km</h4>
          <p>{statistics.moreThanFiveKm} ({((statistics.moreThanFiveKm/statistics.total)*100).toFixed(1)}%)</p>
        </div>
        <div>
          <h4>NaN Values</h4>
          <p>{statistics.nanValues} ({((statistics.nanValues/statistics.total)*100).toFixed(1)}%)</p>
        </div>
      </div>
    </div>
  );
};

export default PatientLocationWidget;