import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import MapComponent from "./MapComponent";
import TableComponent from "./TableComponent";
import Filters from "./Filters";

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
  const [loadingMessage, setLoadingMessage] = useState("Loading Crime Data...");

  // Tracks whether we've ever received real data from the backend.
  // Loading screen only shows before this becomes true (i.e. during cold start).
  const hasReceivedData = useRef(false);

  // Load filter options
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/filters`)
      .then(res => res.json())
      .then(data => {
        setYears(data.years || []);
        setDivisions(data.divisions || []);
        setOffences(data.offences || []);
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

  // Load table data when filters change.
  // Only triggers the loading screen if no data has been received yet (cold start).
  // tableData intentionally excluded from deps to avoid infinite re-fetch loop.
  useEffect(() => {
    if (!selectedYears.length || !selectedDivisions.length || !selectedOffences.length) return;

    // Only show loading screen if the backend hasn't responded yet
    if (!hasReceivedData.current) {
      setLoading(true);
      setLoadingMessage("Loading Crime Data...");
    }

    const yearParams = selectedYears.map(y => `years=${y}`).join("&");
    const divisionParams = selectedDivisions.map(d => `divisions=${encodeURIComponent(d)}`).join("&");
    const offenceParams = selectedOffences.map(o => `offences=${encodeURIComponent(o)}`).join("&");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    fetch(
      `${process.env.REACT_APP_API_URL}/table-data?${yearParams}&${divisionParams}&${offenceParams}`,
      { signal: controller.signal }
    )
      .then(res => {
        clearTimeout(timeout);
        if (!res.ok) throw new Error("Backend not ready");
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          hasReceivedData.current = true; // Mark that backend is alive and has responded
          setTableData(data);
          setLoading(false);
        }
        // If empty response and still waiting, keep loading screen up (cold start)
      })
      .catch(() => {
        clearTimeout(timeout);
        // Only keep loading screen if we've never gotten data (cold start / wake-up)
        if (!hasReceivedData.current) {
          setLoading(true);
        }
        console.error("Backend waking up...");
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedYears, selectedDivisions, selectedOffences]); // tableData removed from deps

  // Show "waking up" message if cold start is taking a while
  useEffect(() => {
    let wakeMsgTimer;
    if (loading) {
      wakeMsgTimer = setTimeout(() => {
        setLoadingMessage("Server is waking up… this may take up to 60 seconds.");
      }, 10000);
    }
    return () => clearTimeout(wakeMsgTimer);
  }, [loading]);

  // Force refresh if still on cold start after 60 seconds
  useEffect(() => {
    if (loading) {
      const reloadTimer = setTimeout(() => {
        window.location.reload();
      }, 60000);
      return () => clearTimeout(reloadTimer);
    }
  }, [loading]);

  // Derive crimeData from tableData
  const crimeData = Array.isArray(tableData)
    ? tableData.reduce((acc, row) => {
        const divisionName = row.division_name?.trim();
        acc[divisionName] = (acc[divisionName] || 0) + row.crime_count;
        return acc;
      }, {})
    : {};

  // Filter table rows based on map click and dropdown selections
  const filteredRows = tableData.filter(row => {
    const matchesClick = clickedDivision ? row.division_name === clickedDivision : true;
    const matchesDropdown = selectedDivisions.length ? selectedDivisions.includes(row.division_name) : true;
    return matchesClick && matchesDropdown;
  });

  return (
    <div className="app-container">
      {loading && (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div className="loading-text">{loadingMessage}</div>
        </div>
      )}

      <div className="disclaimer">
        Disclaimer: This map is for research and educational purposes only. It is not an official government product. Data is sourced from public RBPF reports.
      </div>

      <div className="title-overlay">Bahamas Crime Intelligence Map</div>

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

      <div className="hamburger" onClick={() => setMenuOpen(true)}>☰</div>

      {menuOpen && (
        <div className="menu-overlay">
          <button className="close" onClick={() => setMenuOpen(false)}>×</button>
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

      <div className="map-wrapper">
        <MapComponent
          geojson={geojson}
          mapTheme={mapTheme}
          crimeData={crimeData}
          onDivisionClick={setClickedDivision}
          selectedDivision={clickedDivision}
        />
      </div>

      <div className="table-wrapper">
        <div className="summary-table">
          <TableComponent rows={filteredRows} />
        </div>
      </div>

      <div className="copyright">© 2026 Matthew Williams. All rights reserved.</div>
    </div>
  );
}

export default App;