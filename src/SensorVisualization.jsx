import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, MapPin, Database, FileText, RefreshCw, ZoomIn, ZoomOut, Move, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const SensorVisualization = () => {
  const canvasRef = useRef(null);
  const [sensors, setSensors] = useState([]);
  const [allRecords, setAllRecords] = useState([]); // Store all records
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: '',
    databaseURL: '',
    configured: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Updated sample data based on your Excel file
  const sampleData = [
    //{ id: 3, datetime: '2025-09-21 18:13:21', latitude: 6.933097, longitude: 79.947125, depth: 10.8, status: 'active' },
    { id: 4, datetime: '2025-09-21 18:17:31', latitude: 6.929419, longitude: 79.947903, depth: 21, status: 'active' },
    { id: 5, datetime: '2025-09-21 18:24:53', latitude: 6.9295, longitude: 79.947879, depth: -14.1, status: 'active' },
    { id: 6, datetime: '2025-09-21 18:25:02', latitude: 6.929496, longitude: 79.94789, depth: -14.1, status: 'active' },
    // Adding multiple readings for sensor 5 to demonstrate filtering
    { id: 5, datetime: '2025-09-21 18:20:00', latitude: 6.9295, longitude: 79.947879, depth: -12.5, status: 'active' },
    { id: 5, datetime: '2025-09-21 18:15:00', latitude: 6.9295, longitude: 79.947879, depth: -13.2, status: 'active' },
  ];

  // Convert Excel serial date to JavaScript Date
  const excelDateToJS = (serial) => {
    if (typeof serial === 'string') return serial; // Already a string date
    
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    
    const jsDate = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    return jsDate.toISOString().replace('T', ' ').slice(0, 19);
  };

  // Process sensor data to get only the latest reading per sensor
  const processLatestReadings = (sensorData) => {
    // Group sensors by ID
    const grouped = sensorData.reduce((acc, sensor) => {
      const id = sensor.id;
      if (!acc[id]) {
        acc[id] = [];
      }
      acc[id].push(sensor);
      return acc;
    }, {});

    // Get the latest reading for each sensor
    const latestReadings = Object.entries(grouped).map(([id, records]) => {
      // Sort by datetime descending and take the first (latest)
      const sorted = records.sort((a, b) => {
        const dateA = new Date(a.datetime);
        const dateB = new Date(b.datetime);
        return dateB - dateA;
      });
      
      const latest = sorted[0];
      return {
        ...latest,
        id: typeof latest.id === 'number' ? `S00${latest.id}` : latest.id,
        recordCount: records.length // Add count of records for this sensor
      };
    });

    return latestReadings;
  };

  // Calculate bounds from sensor data
  const calculateBounds = (sensorData) => {
    if (sensorData.length === 0) return null;
    
    const lats = sensorData.map(s => s.latitude);
    const lngs = sensorData.map(s => s.longitude);
    
    const latPadding = (Math.max(...lats) - Math.min(...lats)) * 0.1;
    const lngPadding = (Math.max(...lngs) - Math.min(...lngs)) * 0.1;
    
    return {
      minLat: Math.min(...lats) - latPadding,
      maxLat: Math.max(...lats) + latPadding,
      minLng: Math.min(...lngs) - lngPadding,
      maxLng: Math.max(...lngs) + lngPadding
    };
  };

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = (lat, lng) => {
    if (!bounds || !canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const padding = 50;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;
    
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width + padding;
    const y = canvas.height - (((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height + padding);
    
    return {
      x: x * zoom + pan.x,
      y: y * zoom + pan.y
    };
  };

  // Draw sensors on canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
    
    // Draw sensors
    sensors.forEach(sensor => {
      const pos = latLngToCanvas(sensor.latitude, sensor.longitude);
      
      // Depth-based color gradient
      const depthColor = getDepthColor(sensor.depth);
      
      // Draw sensor icon (circle with X)
      ctx.strokeStyle = sensor.status === 'active' ? depthColor : '#999';
      ctx.fillStyle = sensor.status === 'active' ? depthColor + '33' : '#99999933';
      ctx.lineWidth = 2;
      
      // Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7 * zoom, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // X mark
      const size = 8 * zoom;
      ctx.beginPath();
      ctx.moveTo(pos.x - size, pos.y - size);
      ctx.lineTo(pos.x + size, pos.y + size);
      ctx.moveTo(pos.x + size, pos.y - size);
      ctx.lineTo(pos.x - size, pos.y + size);
      ctx.stroke();
      
      // Draw depth label
      ctx.fillStyle = '#333';
      ctx.font = `bold ${12 * zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(`${sensor.depth}m`, pos.x, pos.y + 30 * zoom);
      
      // Draw sensor ID
      ctx.font = `${10 * zoom}px Arial`;
      ctx.fillText(sensor.id, pos.x, pos.y - 20 * zoom);
      
      // Draw record count if multiple records exist
      if (sensor.recordCount > 1) {
        ctx.fillStyle = '#666';
        ctx.font = `${9 * zoom}px Arial`;
        ctx.fillText(`(${sensor.recordCount} records)`, pos.x, pos.y - 35 * zoom);
      }
    });
    
    // Draw legend
    drawLegend(ctx);
  };

  // Get color based on depth
  const getDepthColor = (depth) => {
    // Handle negative depths (below sea level)
    if (depth < 0) {
      const absDepth = Math.abs(depth);
      if (absDepth < 5) return '#00BCD4';
      if (absDepth < 10) return '#0097A7';
      if (absDepth < 15) return '#00796B';
      if (absDepth < 20) return '#004D40';
      return '#1A237E';
    }
    // Positive depths
    if (depth < 5) return '#4CAF50';
    if (depth < 10) return '#8BC34A';
    if (depth < 15) return '#FFC107';
    if (depth < 20) return '#FF9800';
    if (depth < 25) return '#FF5722';
    return '#F44336';
  };

  // Draw legend
  const drawLegend = (ctx) => {
    const legendX = 20;
    const legendY = 20;
    const legendItems = [
      { depth: '< -20m', color: '#1A237E' },
      { depth: '-20 to -15m', color: '#004D40' },
      { depth: '-15 to -10m', color: '#00796B' },
      { depth: '-10 to -5m', color: '#0097A7' },
      { depth: '-5 to 0m', color: '#00BCD4' },
      { depth: '0-5m', color: '#4CAF50' },
      { depth: '5-10m', color: '#8BC34A' },
      { depth: '10-15m', color: '#FFC107' },
      { depth: '15-20m', color: '#FF9800' },
      { depth: '20-25m', color: '#FF5722' },
      { depth: '> 25m', color: '#F44336' }
    ];
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(legendX, legendY, 140, legendItems.length * 10 + 10);
    
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(legendX, legendY, 140, legendItems.length * 20 + 20);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Depth Legend', legendX + 10, legendY + 15);
    
    ctx.font = '10px Arial';
    legendItems.forEach((item, index) => {
      const y = legendY + 30 + index * 18;
      
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 10, y - 8, 12, 12);
      
      ctx.fillStyle = '#333';
      ctx.fillText(item.depth, legendX + 28, y);
    });
  };

  // Handle file import
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    reader.onload = (event) => {
      let importedData = [];
      
      if (fileExt === 'csv') {
        Papa.parse(event.target.result, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            importedData = results.data.map(row => ({
              id: row.sensor_id || row.id,
              datetime: row.datetime || row.date_time,
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude || row.longtitude), // Handle typo
              depth: parseFloat(row.depth),
              status: row.status || 'active'
            }));
          }
        });
      } else if (fileExt === 'xlsx') {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        importedData = jsonData.map(row => ({
          id: row.sensor_id || row.id,
          datetime: excelDateToJS(row.datetime || row.date_time),
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude || row.longtitude), // Handle typo
          depth: parseFloat(row.depth),
          status: row.status || 'active'
        }));
      }
      
      // Store all records for reference
      setAllRecords(importedData);
      
      // Process to get only latest readings
      const latestReadings = processLatestReadings(importedData);
      setSensors(latestReadings);
      setBounds(calculateBounds(latestReadings));
      setLastUpdateTime(new Date());
    };
    
    if (fileExt === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    
    // Reset file input
    e.target.value = '';
  };

  // Export as JPEG
  const exportAsJPEG = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sensor_visualization_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  };

  // Export as PDF (using browser print)
  const exportAsPDF = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const windowContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sensor Visualization Report</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            img { max-width: 100%; height: auto; }
            h1 { color: #333; }
            .info { margin-top: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .negative { color: #0097A7; }
            .positive { color: #FF9800; }
          </style>
        </head>
        <body>
          <h1>Sensor Depth Visualization Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Active Sensors:</strong> ${sensors.length}</p>
          <p><strong>Total Records Processed:</strong> ${allRecords.length}</p>
          <img src="${dataUrl}" />
          <div class="info">
            <h3>Sensor Summary (Latest Readings):</h3>
            <table>
              <tr>
                <th>Sensor ID</th>
                <th>Depth (m)</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Last Update</th>
                <th>Records</th>
              </tr>
              ${sensors.map(s => `
                <tr>
                  <td>${s.id}</td>
                  <td class="${s.depth < 0 ? 'negative' : 'positive'}">${s.depth}</td>
                  <td>${s.latitude.toFixed(6)}</td>
                  <td>${s.longitude.toFixed(6)}</td>
                  <td>${s.datetime}</td>
                  <td>${s.recordCount || 1}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'height=600,width=1400');
    printWindow.document.write(windowContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Load sample data
  const loadSampleData = () => {
    setAllRecords(sampleData);
    const latestReadings = processLatestReadings(sampleData);
    setSensors(latestReadings);
    setBounds(calculateBounds(latestReadings));
    setLastUpdateTime(new Date());
  };

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleCanvasMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Firebase connection simulation
  const connectToFirebase = () => {
    // This would connect to actual Firebase
    setIsConnected(true);
    console.log('Firebase connection would be established here');
    
    // Simulate real-time updates
    if (!isConnected) {
      const interval = setInterval(() => {
        // In production, this would be real Firebase data
        const mockUpdate = sensors.map(sensor => ({
          ...sensor,
          depth: sensor.depth + (Math.random() - 0.5) * 0.5, // Small random variation
          datetime: new Date().toISOString().replace('T', ' ').slice(0, 19)
        }));
        setSensors(mockUpdate);
        setLastUpdateTime(new Date());
      }, 5000); // Update every 5 seconds
      
      return () => clearInterval(interval);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [sensors, zoom, pan, bounds]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Sensor Depth Visualization System</h1>
        
        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-center">
            
            {/* File Import */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition-colors">
                <Upload size={20} />
                Import Data
                <input 
                  type="file" 
                  accept=".csv,.xlsx" 
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Sample Data */}
            <button
              onClick={loadSampleData}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              <FileText size={20} />
              Load Sample
            </button>
            
            {/* Firebase Connection */}
            <button
              onClick={connectToFirebase}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                isConnected ? 'bg-green-500 text-white' : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              <Database size={20} />
              {isConnected ? 'Connected' : 'Connect Firebase'}
            </button>
            
            {/* Export Options */}
            <button
              onClick={exportAsJPEG}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              <Download size={20} />
              Export JPEG
            </button>
            
            <button
              onClick={exportAsPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              <Download size={20} />
              Export PDF
            </button>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleZoomIn}
                className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={handleResetView}
                className="p-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                title="Reset View"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Visualization Canvas */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <canvas
                ref={canvasRef}
                width={1000}
                height={800}
                className="border border-gray-300 cursor-move"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              {lastUpdateTime && (
                <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  <Clock size={14} />
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </div>
              )}
            </div>
            
            {/* Sensor List */}
            <div className="w-80">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  Active Sensors ({sensors.length})
                </h3>
                {allRecords.length > 0 && (
                  <p className="text-sm text-gray-600">
                    Total records: {allRecords.length}
                  </p>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded p-2">
                {sensors.map((sensor) => (
                  <div
                    key={sensor.id}
                    className={`p-3 mb-2 rounded cursor-pointer transition-colors hover:bg-gray-100 ${
                      selectedSensor?.id === sensor.id ? 'bg-blue-100 border-blue-300 border' : 'bg-gray-50'
                    }`}
                    onClick={() => setSelectedSensor(sensor)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">{sensor.id}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        sensor.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-200'
                      }`}>
                        {sensor.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Depth:</span>
                        <span className={`font-medium ${sensor.depth < 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {sensor.depth}m
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lat:</span>
                        <span>{sensor.latitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lng:</span>
                        <span>{sensor.longitude.toFixed(6)}</span>
                      </div>
                      {sensor.recordCount > 1 && (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Records:</span>
                          <span>{sensor.recordCount}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {sensor.datetime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="mt-4 bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
            <span>
              Sensors: {sensors.filter(s => s.status === 'active').length} active / {sensors.length} total
            </span>
            <span>
              Depth range: {Math.min(...sensors.map(s => s.depth)).toFixed(1)}m to {Math.max(...sensors.map(s => s.depth)).toFixed(1)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorVisualization;