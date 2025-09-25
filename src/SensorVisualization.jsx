import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, MapPin, Database, FileText, RefreshCw, ZoomIn, ZoomOut, Move, Clock, Calendar, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import './index.css'; // Make sure CSS is imported

const SensorVisualization = () => {
  const canvasRef = useRef(null);
  const [sensors, setSensors] = useState([]);
  const [filteredSensors, setFilteredSensors] = useState([]);
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
  
  // Date/Time Filter States
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: ''
  });
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Updated sample data based on your Excel file
  const sampleData = [
    { id: 3, datetime: '9/21/2025 06:13:21', latitude: 6.933097, longitude: 79.947125, depth: 10.8, status: 'active' },
    { id: 4, datetime: '9/21/2025 18:17:31', latitude: 6.929419, longitude: 79.947903, depth: 21, status: 'active' },
    { id: 5, datetime: '9/21/2025 18:24:53', latitude: 6.9295, longitude: 79.947879, depth: -14.1, status: 'active' },
    { id: 6, datetime: '9/21/2025 18:25:02', latitude: 6.929496, longitude: 79.94789, depth: -14.1, status: 'active' },
    { id: 5, datetime: '9/21/2025 18:20:00', latitude: 6.9295, longitude: 79.947879, depth: -12.5, status: 'active' },
    { id: 5, datetime: '9/21/2025 18:15:00', latitude: 6.9295, longitude: 79.947879, depth: -13.2, status: 'active' },
    { id: 7, datetime: '9/22/2025 10:30:00', latitude: 6.9320, longitude: 79.9485, depth: 25.3, status: 'active' },
    { id: 8, datetime: '9/22/2025 14:35:00', latitude: 6.9280, longitude: 79.9465, depth: -5.5, status: 'active' },
    { id: 9, datetime: '9/23/2025 09:15:00', latitude: 6.9310, longitude: 79.9475, depth: 0.5, status: 'active' },
  ];

  // Convert Excel serial date to JavaScript Date
  const excelDateToJS = (serial) => {
    if (typeof serial === 'string') return serial;
    
    // Handle Excel serial date
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    
    // Format date as MM/DD/YYYY HH:MM:SS to match sample data format
    const month = date_info.getMonth() + 1;
    const day = date_info.getDate();
    const year = date_info.getFullYear();
    
    return `${month}/${day}/${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Apply date/time filter
  const applyDateTimeFilter = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      setFilteredSensors(sensors);
      setIsFilterActive(false);
      return;
    }

    const filtered = sensors.filter(sensor => {
      // Parse the sensor datetime more reliably
      let sensorDateTime;
      
      // Handle MM/DD/YYYY format in sample data
      if (sensor.datetime.includes('/')) {
        const [datePart, timePart] = sensor.datetime.split(' ');
        const [month, day, year] = datePart.split('/');
        const timeComponents = timePart ? timePart.split(':') : ['00', '00', '00'];
        
        sensorDateTime = new Date(
          parseInt(year), 
          parseInt(month) - 1, // Month is 0-indexed in JS
          parseInt(day),
          parseInt(timeComponents[0]),
          parseInt(timeComponents[1]),
          parseInt(timeComponents[2] || 0)
        );
      } else {
        // If it's already in a standard format like ISO
        sensorDateTime = new Date(sensor.datetime);
      }
      
      // Create filter boundaries
      let startBoundary = null;
      let endBoundary = null;
      
      if (dateRange.startDate) {
        // Convert input date to JS Date
        const [startYear, startMonth, startDay] = dateRange.startDate.split('-');
        const [startHours, startMinutes] = dateRange.startTime ? dateRange.startTime.split(':') : ['00', '00'];
        
        startBoundary = new Date(
          parseInt(startYear),
          parseInt(startMonth) - 1,
          parseInt(startDay),
          parseInt(startHours),
          parseInt(startMinutes),
          0
        );
      }
      
      if (dateRange.endDate) {
        // Convert input date to JS Date
        const [endYear, endMonth, endDay] = dateRange.endDate.split('-');
        const [endHours, endMinutes] = dateRange.endTime ? dateRange.endTime.split(':') : ['23', '59'];
        
        endBoundary = new Date(
          parseInt(endYear),
          parseInt(endMonth) - 1,
          parseInt(endDay),
          parseInt(endHours),
          parseInt(endMinutes),
          59
        );
      }
      
      // Apply filter
      if (startBoundary && endBoundary) {
        return sensorDateTime >= startBoundary && sensorDateTime <= endBoundary;
      } else if (startBoundary) {
        return sensorDateTime >= startBoundary;
      } else if (endBoundary) {
        return sensorDateTime <= endBoundary;
      }
      
      return true;
    });
    
    setFilteredSensors(filtered);
    setIsFilterActive(true);
    setBounds(calculateBounds(filtered.length > 0 ? filtered : sensors));
  };

  // Clear filter
  const clearFilter = () => {
    setDateRange({
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: ''
    });
    setFilteredSensors(sensors);
    setIsFilterActive(false);
    setBounds(calculateBounds(sensors));
  };

  // Process sensor data to add formatted IDs
  const processSensorData = (sensorData) => {
    return sensorData.map(sensor => ({
      ...sensor,
      displayId: typeof sensor.id === 'number' ? `S00${sensor.id}` : sensor.id
    }));
  };

  // Calculate bounds from sensor data
  const calculateBounds = (sensorData) => {
    if (sensorData.length === 0) return null;
    
    const lats = sensorData.map(s => s.latitude);
    const lngs = sensorData.map(s => s.longitude);
    
    const latPadding = (Math.max(...lats) - Math.min(...lats)) * 0.1 || 0.001;
    const lngPadding = (Math.max(...lngs) - Math.min(...lngs)) * 0.1 || 0.001;
    
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
    ctx.fillStyle = '#9cc4ebff';
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
    
    const sensorsToDisplay = isFilterActive ? filteredSensors : sensors;
    
    // Group sensors by position for overlapping detection
    const positionMap = {};
    sensorsToDisplay.forEach(sensor => {
      const pos = latLngToCanvas(sensor.latitude, sensor.longitude);
      const key = `${Math.round(pos.x)}_${Math.round(pos.y)}`;
      if (!positionMap[key]) {
        positionMap[key] = [];
      }
      positionMap[key].push({ ...sensor, pos });
    });
    
    // Draw all sensor records
    Object.values(positionMap).forEach(sensorGroup => {
      sensorGroup.forEach((sensor, index) => {
        const offset = index * 15 * zoom;
        const pos = {
          x: sensor.pos.x + offset,
          y: sensor.pos.y + offset
        };
        
        // INVERTED depth-based color gradient
        const depthColor = getDepthColor(sensor.depth);
        
        // Draw sensor icon
        ctx.strokeStyle = sensor.status === 'active' ? depthColor : '#999';
        ctx.fillStyle = sensor.status === 'active' ? depthColor + '33' : '#99999933';
        ctx.lineWidth = 2;
        
        // Circle - fixed size regardless of zoom
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // X mark - fixed size regardless of zoom
        const size = 6;
        ctx.beginPath();
        ctx.moveTo(pos.x - size, pos.y - size);
        ctx.lineTo(pos.x + size, pos.y + size);
        ctx.moveTo(pos.x + size, pos.y - size);
        ctx.lineTo(pos.x - size, pos.y + size);
        ctx.stroke();
        
        // Draw depth label
        ctx.fillStyle = '#333';
        ctx.font = `bold ${12}px Arial`; // Fixed size regardless of zoom
        ctx.textAlign = 'center';
        ctx.fillText(`${sensor.depth.toFixed(3)}m`, pos.x, pos.y + 25);
        
        // Draw sensor ID
        ctx.font = `10px Arial`; // Fixed size regardless of zoom
        ctx.fillText(sensor.displayId, pos.x, pos.y - 20);
        
        // Multiple records indicator without showing time
        // if (sensorGroup.length > 1) {
        //   ctx.fillStyle = '#666';
        //   ctx.font = `${8 * zoom}px Arial`;
        //   ctx.fillText(`(${sensorGroup.indexOf(sensor) + 1}/${sensorGroup.length})`, pos.x, pos.y - 35 * zoom);
        // }
      });
    });
    
    // Draw legend
    drawLegend(ctx);
    
    // Draw filter indicator if active
    if (isFilterActive) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillRect(canvas.width - 200, 20, 180, 30);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FILTER ACTIVE', canvas.width - 110, 40);
    }
  };

  // INVERTED color scheme
  const getDepthColor = (depth) => {
    const absDepth = Math.abs(depth);
    
    if (absDepth > 25) return '#00C853'; // Very deep - Bright Green
    if (absDepth > 20) return '#2E7D32'; // Deep - Dark Green
    if (absDepth > 15) return '#388E3C'; // Moderately deep - Green
    if (absDepth > 10) return '#689F38'; // Medium deep - Light Green
    if (absDepth > 7) return '#FDD835'; // Medium - Yellow
    if (absDepth > 5) return '#FFB300'; // Getting shallow - Orange
    if (absDepth > 3) return '#FF6F00'; // Shallow - Dark Orange
    if (absDepth > 1) return '#E65100'; // Very shallow - Red-Orange
    return '#B71C1C'; // Extremely shallow - Dark Red
  };

  // Draw legend with INVERTED color scheme
  const drawLegend = (ctx) => {
    const legendX = 20;
    const legendY = 20;
    const legendItems = [
      { depth: '> 25m depth', color: '#00C853' },
      { depth: '20-25m depth', color: '#2E7D32' },
      { depth: '15-20m depth', color: '#388E3C' },
      { depth: '10-15m depth', color: '#689F38' },
      { depth: '7-10m depth', color: '#FDD835' },
      { depth: '5-7m depth', color: '#FFB300' },
      { depth: '3-5m depth', color: '#FF6F00' },
      { depth: '1-3m depth', color: '#E65100' },
      { depth: '< 1m depth', color: '#B71C1C' },
    ];
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(legendX, legendY, 150, legendItems.length * 18 + 30);
    
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(legendX, legendY, 150, legendItems.length * 18 + 30);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Depth Legend', legendX + 10, legendY + 15);
    
    ctx.font = '10px Arial';
    legendItems.forEach((item, index) => {
      const y = legendY + 30 + index * 16;
      
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX + 10, y - 8, 12, 12);
      
      ctx.fillStyle = '#333';
      ctx.fillText(item.depth, legendX + 28, y);
    });
    
    // Add quality indicators with CRITICAL instead of BAD
    ctx.font = 'bold 9px Arial';
    ctx.fillStyle = '#00C853';
    ctx.fillText('GOOD ↑', legendX + 100, legendY + 35);
    ctx.fillStyle = '#B71C1C';
    ctx.fillText('CRITICAL ↓', legendX + 85, legendY + legendItems.length * 16 + 15);
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
              longitude: parseFloat(row.longitude || row.longtitude),
              depth: parseFloat(row.depth),
              status: row.status || 'active'
            }));
            
            const processedData = processSensorData(importedData);
            setAllRecords(processedData);
            setSensors(processedData);
            setFilteredSensors(processedData);
            setBounds(calculateBounds(processedData));
            setLastUpdateTime(new Date());
          }
        });
      } else if (fileExt === 'xlsx') {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        importedData = jsonData.map(row => {
          // Get datetime value - could be serial date or string
          const rawDatetime = row.datetime || row.date_time;
          // Process datetime based on its type
          const processedDatetime = excelDateToJS(rawDatetime);
          
          return {
            id: row.sensor_id || row.id,
            datetime: processedDatetime,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude || row.longtitude),
            depth: parseFloat(row.depth),
            status: row.status || 'active'
          };
        });
        
        const processedData = processSensorData(importedData);
        setAllRecords(processedData);
        setSensors(processedData);
        setFilteredSensors(processedData);
        setBounds(calculateBounds(processedData));
        setLastUpdateTime(new Date());
      }
    };
    
    if (fileExt === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    
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

  // Export as PDF
  const exportAsPDF = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    const sensorsToDisplay = isFilterActive ? filteredSensors : sensors;
    
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
            .deep { color: #00C853; font-weight: bold; }
            .critical { color: #B71C1C; font-weight: bold; }
            .medium { color: #FF6F00; }
          </style>
        </head>
        <body>
          <h1>Sensor Depth Visualization Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Sensor Records:</strong> ${sensorsToDisplay.length}</p>
          <p><strong>Unique Sensors:</strong> ${[...new Set(sensorsToDisplay.map(s => s.id))].length}</p>
          ${isFilterActive ? `<p><strong>Filter Applied:</strong> ${dateRange.startDate || 'Start'} to ${dateRange.endDate || 'End'}</p>` : ''}
          <img src="${dataUrl}" />
          <div class="info">
            <h3>Sensor Records:</h3>
            <table>
              <tr>
                <th>Sensor ID</th>
                <th>Depth (m)</th>
                <th>Status</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Timestamp</th>
              </tr>
              ${sensorsToDisplay.map(s => {
                const absDepth = Math.abs(s.depth);
                const qualityClass = absDepth > 15 ? 'deep' : absDepth < 5 ? 'critical' : 'medium';
                const quality = absDepth > 15 ? 'Good' : absDepth < 5 ? 'Critical' : 'Fair';
                return `
                  <tr>
                    <td>${s.displayId}</td>
                    <td class="${qualityClass}">${s.depth.toFixed(3)}</td>
                    <td class="${qualityClass}">${quality}</td>
                    <td>${s.latitude.toFixed(6)}</td>
                    <td>${s.longitude.toFixed(6)}</td>
                    <td>${s.datetime}</td>
                  </tr>
                `;
              }).join('')}
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
    const processedData = processSensorData(sampleData);
    setAllRecords(processedData);
    setSensors(processedData);
    setFilteredSensors(processedData);
    setBounds(calculateBounds(processedData));
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
  
  // Handle zoom with mouse wheel - zoom in/out centered on mouse position
  const handleMouseWheel = (e) => {
    e.preventDefault();
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom factor based on wheel direction
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.5), 10); // Constrain between 0.5x and 10x
    
    // Calculate mouse position in canvas space before zoom
    const mouseXBeforeZoom = (mouseX - pan.x) / zoom;
    const mouseYBeforeZoom = (mouseY - pan.y) / zoom;
    
    // Calculate new pan position to keep the mouse point fixed
    const newPanX = mouseX - mouseXBeforeZoom * newZoom;
    const newPanY = mouseY - mouseYBeforeZoom * newZoom;
    
    // Update state
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomIn = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const newZoom = Math.min(zoom * 1.2, 10);
    
    // Calculate center point in canvas space before zoom
    const centerXBeforeZoom = (centerX - pan.x) / zoom;
    const centerYBeforeZoom = (centerY - pan.y) / zoom;
    
    // Calculate new pan position to keep the center point fixed
    const newPanX = centerX - centerXBeforeZoom * newZoom;
    const newPanY = centerY - centerYBeforeZoom * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };
  
  const handleZoomOut = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const newZoom = Math.max(zoom / 1.2, 0.5);
    
    // Calculate center point in canvas space before zoom
    const centerXBeforeZoom = (centerX - pan.x) / zoom;
    const centerYBeforeZoom = (centerY - pan.y) / zoom;
    
    // Calculate new pan position to keep the center point fixed
    const newPanX = centerX - centerXBeforeZoom * newZoom;
    const newPanY = centerY - centerYBeforeZoom * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };
  
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Firebase connection simulation
  const connectToFirebase = () => {
    setIsConnected(true);
    console.log('Firebase connection would be established here');
  };

  useEffect(() => {
    drawCanvas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSensors, sensors, zoom, pan, bounds, isFilterActive]);

  // Focus on selected sensor
  const focusOnSensor = (sensor) => {
    if (!sensor || !bounds) return;
    
    // Center the view on this sensor
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Target zoom level
    const newZoom = 1.5;
    
    // Convert sensor coordinates to canvas coordinates at current zoom
    const sensorPos = {
      x: ((sensor.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (canvas.width - 100) + 50,
      y: canvas.height - (((sensor.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (canvas.height - 100) + 50)
    };
    
    // Calculate the pan needed to center the sensor at the new zoom level
    const newPan = {
      x: centerX - sensorPos.x * newZoom,
      y: centerY - sensorPos.y * newZoom
    };
    
    // Update zoom and pan
    setZoom(newZoom);
    setPan(newPan);
    
    // Update selected sensor
    setSelectedSensor(sensor);
  };

  // Group sensors by ID for the list
  const getSensorSummary = () => {
    const sensorsToDisplay = isFilterActive ? filteredSensors : sensors;
    const grouped = sensorsToDisplay.reduce((acc, sensor) => {
      const id = sensor.id;
      if (!acc[id]) {
        acc[id] = {
          id: sensor.displayId,
          records: [],
          minDepth: sensor.depth,
          maxDepth: sensor.depth,
          avgDepth: 0,
          latitude: sensor.latitude,
          longitude: sensor.longitude,
          status: sensor.status
        };
      }
      acc[id].records.push(sensor);
      acc[id].minDepth = Math.min(acc[id].minDepth, sensor.depth);
      acc[id].maxDepth = Math.max(acc[id].maxDepth, sensor.depth);
      return acc;
    }, {});
    
    Object.values(grouped).forEach(summary => {
      const sum = summary.records.reduce((s, r) => s + r.depth, 0);
      summary.avgDepth = (sum / summary.records.length).toFixed(3);
    });
    
    return Object.values(grouped);
  };

  const sensorSummaries = getSensorSummary();

  // Inline styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '16px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      padding: '16px',
      marginBottom: '16px'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    primaryButton: {
      backgroundColor: '#3B82F6',
      color: 'white'
    },
    successButton: {
      backgroundColor: '#10B981',
      color: 'white'
    },
    canvas: {
      border: '1px solid #d1d5db',
      cursor: isDragging ? 'grabbing' : 'grab',
      backgroundColor: 'white'
    },
    input: {
      padding: '6px 10px',
      borderRadius: '4px',
      border: '1px solid #d1d5db',
      fontSize: '14px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: '#1f2937' }}>
          Sensor Depth Visualization System
        </h1>
        
        {/* Date/Time Filter Panel */}
        <div style={{ ...styles.card, backgroundColor: '#f8fafc', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Calendar size={20} color="#3B82F6" />
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Date & Time Filter</h3>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                style={styles.input}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Start Time
              </label>
              <input
                type="time"
                value={dateRange.startTime}
                onChange={(e) => setDateRange({...dateRange, startTime: e.target.value})}
                style={styles.input}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                style={styles.input}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                End Time
              </label>
              <input
                type="time"
                value={dateRange.endTime}
                onChange={(e) => setDateRange({...dateRange, endTime: e.target.value})}
                style={styles.input}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button
                onClick={applyDateTimeFilter}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                <Filter size={16} />
                Apply Filter
              </button>
              
              <button
                onClick={clearFilter}
                style={{ ...styles.button, backgroundColor: '#6b7280', color: 'white' }}
              >
                Clear
              </button>
            </div>
          </div>
          
          {isFilterActive && (
            <div style={{ 
              marginTop: '12px', 
              padding: '8px 12px', 
              backgroundColor: '#3B82F6', 
              color: 'white',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>Filter Active:</strong> Showing {filteredSensors.length} of {sensors.length} records
              {dateRange.startDate && ` from ${dateRange.startDate}`}
              {dateRange.endDate && ` to ${dateRange.endDate}`}
            </div>
          )}
        </div>
        
        {/* Control Panel */}
        <div style={styles.card}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            
            {/* File Import */}
            <label style={{ ...styles.button, ...styles.primaryButton }}>
              <Upload size={20} />
              Import Data
              <input 
                type="file" 
                accept=".csv,.xlsx" 
                onChange={handleFileImport}
                style={{ display: 'none' }}
              />
            </label>
            
            {/* Sample Data */}
            <button
              onClick={loadSampleData}
              style={{ ...styles.button, ...styles.successButton }}
            >
              <FileText size={20} />
              Load Sample
            </button>
            
            {/* Firebase Connection */}
            <button
              onClick={connectToFirebase}
              style={{ 
                ...styles.button, 
                backgroundColor: isConnected ? '#10B981' : '#6b7280',
                color: 'white'
              }}
            >
              <Database size={20} />
              {isConnected ? 'Connected' : 'Connect Firebase'}
            </button>
            
            {/* Export Options */}
            <button
              onClick={exportAsJPEG}
              style={{ ...styles.button, backgroundColor: '#8B5CF6', color: 'white' }}
            >
              <Download size={20} />
              Export JPEG
            </button>
            
            <button
              onClick={exportAsPDF}
              style={{ ...styles.button, backgroundColor: '#EF4444', color: 'white' }}
            >
              <Download size={20} />
              Export PDF
            </button>
            
            {/* Zoom Controls */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                onClick={handleZoomIn}
                style={{ ...styles.button, backgroundColor: '#e5e7eb' }}
                title="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={handleZoomOut}
                style={{ ...styles.button, backgroundColor: '#e5e7eb' }}
                title="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <button
                onClick={() => selectedSensor ? focusOnSensor(selectedSensor) : handleResetView()}
                style={{ 
                  ...styles.button, 
                  backgroundColor: selectedSensor ? '#3B82F6' : '#e5e7eb',
                  color: selectedSensor ? 'white' : 'inherit'
                }}
                title={selectedSensor ? "Focus on Selected Sensor" : "Reset View"}
              >
                <MapPin size={18} />
                {selectedSensor ? ' Focus View' : ' Reset View'}
              </button>
              <button
                onClick={handleResetView}
                style={{ ...styles.button, backgroundColor: '#e5e7eb' }}
                title="Reset View"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Visualization */}
        <div style={styles.card}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <canvas
                ref={canvasRef}
                width={1000}
                height={600}
                style={styles.canvas}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleMouseWheel}
              />
              {lastUpdateTime && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} />
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </div>
              )}
            </div>
            
            {/* Sensor Summary List */}
            <div style={{ width: '320px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                  Sensor Summary
                </h3>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  {sensorSummaries.length} unique sensors | {isFilterActive ? filteredSensors.length : sensors.length} records
                </p>
              </div>
              
              <div style={{ 
                maxHeight: '500px', 
                overflowY: 'auto', 
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px'
              }}>
                {sensorSummaries.map((summary) => {
                  const avgDepth = parseFloat(summary.avgDepth);
                  const depthQuality = Math.abs(avgDepth) > 15 ? 'Good' : Math.abs(avgDepth) < 5 ? 'Critical' : 'Fair';
                  
                  // IMPROVED COLORS FOR BETTER READABILITY
                  const qualityColor = 
                    Math.abs(avgDepth) > 15 ? '#00C853' : 
                    Math.abs(avgDepth) < 5 ? '#B71C1C' : 
                    '#FF6F00'; // Changed from yellow to dark orange for better readability
                  
                  const bgColor = 
                    Math.abs(avgDepth) > 15 ? 'rgba(0, 200, 83, 0.1)' :
                    Math.abs(avgDepth) < 5 ? 'rgba(183, 28, 28, 0.1)' :
                    'rgba(255, 111, 0, 0.1)'; // Light orange background
                  
                  return (
                    <div
                      key={summary.id}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: `2px solid ${qualityColor}33`,
                        cursor: 'pointer'
                      }}
                      onClick={() => focusOnSensor(summary)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', fontSize: '16px' }}>{summary.id}</span>
                        <span style={{ 
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          backgroundColor: bgColor,
                          color: qualityColor,
                          fontWeight: 'bold',
                          border: `1px solid ${qualityColor}`
                        }}>
                          {depthQuality}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Avg Depth:</span>
                          <span style={{ 
                            fontWeight: '600', 
                            color: qualityColor,
                            textShadow: Math.abs(avgDepth) > 5 && Math.abs(avgDepth) <= 10 ? 
                              '0 0 3px rgba(255,255,255,0.8)' : 'none'
                          }}>
                            {summary.avgDepth}m
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Range:</span>
                          <span>{summary.minDepth.toFixed(3)}m to {summary.maxDepth.toFixed(3)}m</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>Records:</span>
                          <span style={{ fontWeight: '600' }}>{summary.records.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Location:</span>
                          <span style={{ fontSize: '11px' }}>{summary.latitude.toFixed(4)}, {summary.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Bar */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
            <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
            <span>
              {isFilterActive ? 'Filtered: ' : ''}
              {isFilterActive ? filteredSensors.length : sensors.length} records | 
              {sensorSummaries.length} sensors
            </span>
            <span>
              Depth range: {
                (isFilterActive ? filteredSensors : sensors).length > 0 ?
                `${Math.min(...(isFilterActive ? filteredSensors : sensors).map(s => s.depth)).toFixed(3)}m to ${Math.max(...(isFilterActive ? filteredSensors : sensors).map(s => s.depth)).toFixed(3)}m`
                : 'No data'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorVisualization;