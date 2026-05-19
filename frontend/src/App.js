import React,  { useEffect, useState } from "react";
import "./App.css";
import MapComponent from "./MapComponent";
import TableComponent from "./TableComponent";
import Filters from "./Filters";

// This is the main App component that orchestrates the entire application. 
// It manages the state for filters, map theme, GeoJSON data, and the currently clicked division. 
// The App component is responsible for fetching filter options and table data from the backend API, as well as loading the GeoJSON data for the map. 
// It also derives the crime data for the map from the table data and handles the logic for filtering the table based on user interactions with the map and dropdowns.
function App() {
  const [years, setYears] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [offences, setOffences] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedDivisions, setSelectedDivisions] = useState([]);
  const [selectedOffences, setSelectedOffences] = useState([]);
  const [mapTheme, setMapTheme] = useState("light");
  const [geojson, setGeojson] = useState(null);
  const [clickedDivision, setClickedDivision] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);


  // Load filter options
useEffect(() => {
  fetch(`${process.env.REACT_APP_API_URL}/filters`) //https://locahost:8000/filters
    .then(res => res.json())
    .then(data => {
      setYears(data.years || []);
      setDivisions(data.divisions || []);
      setOffences(data.offences || []);
      // Sets sensible defaults
      setSelectedYears(data.years || []);
      setSelectedDivisions(data.divisions || []);
      setSelectedOffences(data.offences || []);
    });
}, []);

// Load GeoJSON separately (only once)
useEffect(() => {
  fetch("/geo/police_subdivisions.geojson")
    .then(res => res.json())
    .then(data => setGeojson(data));
}, []);

// Load map + table when filters change
useEffect(() => {
  if (selectedYears.length && selectedDivisions.length && selectedOffences.length) {
    setLoading(true);
    const yearParams = selectedYears.map(y => `years=${y}`).join("&");
    const divisionParams = selectedDivisions.map(d => `divisions=${encodeURIComponent(d)}`).join("&");
    const offenceParams = selectedOffences.map(o => `offences=${encodeURIComponent(o)}`).join("&");

    fetch(`${process.env.REACT_APP_API_URL}/table-data?${yearParams}&${divisionParams}&${offenceParams}`) //https://locahost:8000/table-data?${yearParams}&${divisionParams}&${offenceParams}
      .then(res => res.json())
      .then(data => {
        setTableData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }
}, [selectedYears, selectedDivisions, selectedOffences]);

//Derive crimeData from tableData
const crimeData = Array.isArray(tableData)
  ? tableData.reduce((acc, row) => {
      const divisionName = row.division_name?.trim();
      acc[divisionName] = (acc[divisionName] || 0) + row.crime_count;
      return acc;
    }, {})
  : {};

    // Filter table data based on clicked division
  const filteredRows = tableData.filter(row => {
  const matchesClick = clickedDivision 
    ? row.division_name === clickedDivision 
    : true;

  const matchesDropdown = selectedDivisions.length
    ? selectedDivisions.includes(row.division_name)
    : true;

  return matchesClick && matchesDropdown;
    });


  return (
    // Main app container with all components and overlays
    <div className="app-container">
      {/* Loading overlay */}
          {loading && (
            <div className="loading-screen">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading Crime Data...</div>
            </div>
          )}

      {/* Disclaimer banner */}
      <div className="disclaimer">
        Disclaimer: This map is for research and educational purposes only. It is not an official government product. Data is sourced from public RBPF reports.
      </div>

      {/* Title overlay */}
      <div className="title-overlay">
        Bahamas Crime Intelligence Map
      </div>

      {/* Filters overlay */}
      <Filters
        years={years}
        divisions={divisions}
        offences={offences}
        selectedYears={selectedYears}
        setSelectedYears={setSelectedYears}
        selectedDivisions={selectedDivisions}
        setSelectedDivisions={setSelectedDivisions}
        selectedOffences={selectedOffences}
        setSelectedOffences={setSelectedOffences}
        mapTheme={mapTheme}
        setMapTheme={setMapTheme}
      />

      {/* Hamburger menu */}
      <div className="hamburger" onClick={() => setMenuOpen(true)}>
        ☰
      </div>

      {menuOpen && (
        <div className="menu-overlay">
          <button className="close" onClick={() => setMenuOpen(false)}>×</button>

          {/* Use your Filters component here */}
          <Filters
            years={years}
            divisions={divisions}
            offences={offences}
            selectedYears={selectedYears}
            setSelectedYears={setSelectedYears}
            selectedDivisions={selectedDivisions}
            setSelectedDivisions={setSelectedDivisions}
            selectedOffences={selectedOffences}
            setSelectedOffences={setSelectedOffences}
            mapTheme={mapTheme}
            setMapTheme={setMapTheme}
          />
        </div>
      )}




      {/* Map wrapper */}
      <div className="map-wrapper">
        <MapComponent 
        geojson={geojson} 
        mapTheme={mapTheme} 
        crimeData={crimeData} 
        onDivisionClick={setClickedDivision} 
        selectedDivision={clickedDivision} />
      </div>

     {/* Summary table overlay */}
      <div className="table-wrapper">
        <div className="summary-table">
          <TableComponent rows={filteredRows} />
        </div>
      </div>

      {/* Copyright below table */}
      <div className="copyright">
        © 2026 Matthew Williams. All rights reserved.
      </div>
      </div>
  );
}

export default App;