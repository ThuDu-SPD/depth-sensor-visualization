# Sensor Visualization System - Learning Guide

## Introduction

This document provides a detailed explanation of how the Sensor Visualization System works. It's designed for people with no prior knowledge of the codebase, helping you understand the key components, libraries, and functionality.

## Project Overview

The Sensor Visualization System is a modern web application built with React that displays sensor data on both Google Maps and a custom canvas. It allows users to:

1. Import sensor data from CSV or Excel files with robust column name handling
2. View sensors with depth information on interactive maps
3. Filter sensor data by date/time ranges
4. Export visualizations as JPEG or PDF reports
5. Analyze sensor depth readings with color-coded indicators
6. Switch between Google Maps and Canvas views
7. Handle mobile and desktop responsive layouts

## Technology Stack & Why These Choices

### React - The Foundation

**What is React?**
React is a JavaScript library for building user interfaces, particularly web applications. It was created by Facebook and is now maintained by Meta and the open-source community.

**Why React for this project?**

1. **Component-Based Architecture**: React allows us to break down the complex sensor visualization interface into smaller, manageable components
2. **State Management**: React's state system makes it easy to handle dynamic data like sensor readings, filters, and user interactions
3. **Virtual DOM**: Provides efficient updates when sensor data changes, ensuring smooth performance
4. **Large Ecosystem**: Extensive library support for maps, data visualization, and file handling
5. **Developer Tools**: Excellent debugging and development experience
6. **Community Support**: Large community, extensive documentation, and learning resources

**How React Works in Our Application:**
- Each UI element (buttons, maps, filters) is a React component
- State changes trigger automatic re-rendering of affected components
- Components can communicate through props and shared state
- Event handlers manage user interactions like file uploads and map navigation

### TypeScript - Enhanced Development (Why It's Beneficial)

**What is TypeScript?**
TypeScript is a superset of JavaScript that adds static type definitions. While our current project uses JavaScript, here's why TypeScript would be beneficial:

**Benefits of TypeScript:**
1. **Type Safety**: Prevents common bugs by catching type errors at compile time
2. **Better IDE Support**: Enhanced autocomplete, refactoring, and navigation
3. **Self-Documenting Code**: Types serve as inline documentation
4. **Easier Refactoring**: Confident code changes with compile-time error checking
5. **Team Collaboration**: Clear interfaces between components

**Example of how TypeScript would improve our sensor data handling:**
```typescript
interface SensorData {
  id: number;
  datetime: string;
  latitude: number;
  longitude: number;
  depth: number;
  status: 'active' | 'inactive';
}

function processSensorData(data: SensorData[]): ProcessedSensorData[] {
  // TypeScript ensures we only pass valid sensor data
  return data.map(sensor => ({
    ...sensor,
    displayId: `S00${sensor.id}`,
    depthColor: getDepthColor(sensor.depth)
  }));
}
```

### How to Initialize a React Project

**Method 1: Create React App (Traditional)**
```bash
npx create-react-app sensor-visualization
cd sensor-visualization
npm start
```

**Method 2: Vite (Modern - What We Used)**
```bash
npm create vite@latest sensor-visualization -- --template react
cd sensor-visualization
npm install
npm run dev
```

**Why We Chose Vite:**
1. **Faster Development**: Lightning-fast hot module replacement (HMR)
2. **Modern Build Tool**: Uses native ES modules for faster builds
3. **Optimized Production Builds**: Smaller bundle sizes
4. **TypeScript Support**: Easy TypeScript integration when needed
5. **Plugin Ecosystem**: Rich plugin system for extended functionality

### Setting Up Our Specific Project

**Step-by-step initialization:**
```bash
# 1. Create the project
npm create vite@latest sensor-visualization -- --template react

# 2. Navigate and install dependencies
cd sensor-visualization
npm install

# 3. Install our specific dependencies
npm install @react-google-maps/api
npm install xlsx papaparse
npm install lucide-react
npm install html2canvas

# 4. Install development dependencies
npm install -D tailwindcss postcss autoprefixer
npm install -D eslint eslint-plugin-react
npx tailwindcss init -p

# 5. Start development server
npm run dev
```

## Application Flow & Architecture

### High-Level Application Flow

```
User Interaction → State Update → Component Re-render → UI Update
     ↓              ↓              ↓                 ↓
[File Upload] → [Parse Data] → [Update Sensors] → [Redraw Map/Canvas]
[Filter Data] → [Apply Filter] → [Update Display] → [Show Filtered Results]
[Export Data] → [Capture View] → [Generate File] → [Download File]
```

### Component Hierarchy

```
App
└── SensorVisualization (Main Component)
    ├── Date/Time Filter Panel
    ├── Control Panel (Import, Export, Connect)
    ├── Main Visualization Area
    │   ├── Google Maps (with Markers & InfoWindows)
    │   └── Canvas View (with Custom Drawing)
    ├── Sensor Summary Sidebar
    └── Status Bar
```

### Data Flow Lifecycle

1. **Data Import Phase**
   - User selects CSV/Excel file
   - File reader processes the content
   - Column names are normalized (trimmed, lowercased)
   - Data is parsed and validated
   - Invalid records are filtered out
   - Processed data updates application state

2. **Visualization Phase**
   - State change triggers component re-render
   - Bounds are calculated from sensor coordinates
   - Map centers and zooms to fit all sensors
   - Canvas draws sensors with depth-based colors
   - Legend and controls are updated

3. **Interaction Phase**
   - User interactions (zoom, pan, filter) update state
   - Components respond to state changes
   - UI elements reflect current application state
   - Real-time feedback is provided to users

4. **Export Phase**
   - Current view is captured as image
   - Data is formatted for export
   - Files are generated and downloaded

## Key Libraries and Their Purpose

### Core React Libraries
- **React**: The foundation library for building user interfaces
- **React DOM**: Renders React components to the web browser
- **useState & useEffect**: React hooks for state management and side effects

### Mapping and Visualization
- **@react-google-maps/api**: 
  - **Purpose**: Integrates Google Maps into React applications
  - **Why**: Provides React components (GoogleMap, Marker, InfoWindow) with proper event handling
  - **Features**: Marker clustering, custom controls, map styles, and geocoding

### Data Processing Libraries
- **XLSX**: 
  - **Purpose**: Read and write Excel files in the browser
  - **Why**: Enables users to import sensor data from Excel spreadsheets
  - **Features**: Supports .xlsx format, handles date serialization, processes multiple sheets

- **Papa Parse**: 
  - **Purpose**: Powerful CSV parser for JavaScript
  - **Why**: Fast and reliable CSV parsing with error handling
  - **Features**: Header detection, type conversion, streaming support, error reporting

### Export and Visualization
- **html2canvas**: 
  - **Purpose**: Screenshot HTML elements as images
  - **Why**: Captures Google Maps and other DOM elements for export
  - **Features**: Cross-browser compatibility, handles complex layouts, preserves styling

### UI and Icons
- **Lucide React**: 
  - **Purpose**: Modern icon library with React components
  - **Why**: Consistent, scalable icons that integrate seamlessly with React
  - **Features**: Tree-shakeable, customizable, wide variety of icons

### Development and Build Tools
- **Vite**: 
  - **Purpose**: Next-generation frontend build tool
  - **Why**: Fast development server, efficient bundling, modern JavaScript support
  - **Features**: Hot module replacement, TypeScript support, plugin ecosystem

- **Tailwind CSS**: 
  - **Purpose**: Utility-first CSS framework
  - **Why**: Rapid UI development with consistent design system
  - **Features**: Responsive design, dark mode support, customizable

## Core Components & Architecture Patterns

### Main Component: SensorVisualization

This is the primary React component that orchestrates the entire application. It demonstrates several important React patterns:

**State Management Pattern:**
```javascript
// Multiple useState hooks manage different aspects of the application
const [sensors, setSensors] = useState([]);           // Main data
const [filteredSensors, setFilteredSensors] = useState([]); // Filtered data
const [selectedSensor, setSelectedSensor] = useState(null); // UI state
const [dateRange, setDateRange] = useState({...});    // Filter state
```

**Effect Hook Pattern:**
```javascript
// useEffect for side effects like canvas drawing
useEffect(() => {
  if (!useGoogleMap) {
    drawCanvas(); // Redraw when data or view changes
  }
}, [filteredSensors, zoom, pan, bounds]);
```

**Event Handler Pattern:**
```javascript
// Functions that handle user interactions and update state
const handleFileImport = (e) => { /* File processing logic */ };
const applyDateTimeFilter = () => { /* Filter application logic */ };
const focusOnSensor = (sensor) => { /* Navigation logic */ };
```

### Component Responsibility Breakdown

**SensorVisualization Component Responsibilities:**
1. **State Management**: Manages all application state
2. **Data Processing**: Handles file imports and data transformation
3. **Event Handling**: Responds to user interactions
4. **Rendering Logic**: Decides what to display based on current state
5. **Side Effects**: Canvas drawing, API calls, timer management

**React Hooks Used:**
- `useState`: Managing component state
- `useEffect`: Side effects and lifecycle events
- `useCallback`: Optimizing function references
- `useMemo`: Memoizing expensive calculations
- `useRef`: Accessing DOM elements (canvas reference)

## Key Functions Explained

### Data Processing Functions

#### `parseNumericValue(value)` - Robust Number Parsing
- **Purpose**: Safely converts various input formats to numbers
- **Why Important**: Handles edge cases like spaces, null values, and invalid data
- **How it works**:
  1. Checks for null/undefined/empty values
  2. Trims whitespace from string values
  3. Converts to float and validates the result
  4. Returns 0 for invalid values to prevent NaN errors

```javascript
const parseNumericValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const cleanValue = String(value).trim();
  if (cleanValue === '') return 0;
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};
```

#### `excelDateToJS(serial)` - Excel Date Conversion
- **Purpose**: Converts Excel's serial date format to JavaScript Date strings
- **Why Needed**: Excel stores dates as numbers (days since Jan 1, 1900)
- **How it works**: 
  1. Separates the whole number (date) from decimal (time)
  2. Calculates the actual date by subtracting Excel's epoch offset
  3. Extracts hours, minutes, seconds from the fractional part
  4. Formats as MM/DD/YYYY HH:MM:SS string

```javascript
const excelDateToJS = (serial) => {
  if (typeof serial === 'string') return serial;
  
  // Excel epoch adjustment (difference between Excel and Unix epochs)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  // Extract time from fractional part
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  
  // Format for consistent display
  const month = date_info.getMonth() + 1;
  const day = date_info.getDate();
  const year = date_info.getFullYear();
  
  return `${month}/${day}/${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
```

#### Advanced Data Import Handling
- **Column Name Normalization**: Automatically handles variations in column names
- **Flexible Mapping**: Supports multiple column name formats (e.g., "lat" or "latitude")
- **Error Recovery**: Filters out invalid records while preserving good data
- **User Feedback**: Provides real-time status updates during import

```javascript
// Robust column name handling
const normalizedRow = {};
Object.keys(row).forEach(key => {
  const trimmedKey = key.trim().toLowerCase();
  normalizedRow[trimmedKey] = row[key];
});

// Flexible field mapping
const sensorData = {
  id: normalizedRow['sensor_id'] || normalizedRow['id'] || normalizedRow['sensor id'],
  latitude: parseNumericValue(normalizedRow['latitude'] || normalizedRow['lat']),
  longitude: parseNumericValue(normalizedRow['longitude'] || normalizedRow['lng']),
  depth: parseNumericValue(normalizedRow['depth'] || normalizedRow['depth_m'])
};
```

#### `processSensorData(sensorData)`
- **Purpose**: Standardizes sensor data format and adds display IDs
- **How it works**:
  1. Takes raw sensor data from imports
  2. Adds formatted display IDs for consistent presentation
  3. Returns processed data with uniform structure

#### `calculateBounds(sensorData)`
- **Purpose**: Determines geographical boundaries of all sensors
- **How it works**:
  1. Extracts all latitude and longitude values
  2. Finds minimum and maximum values
  3. Adds padding for better visualization
  4. Returns boundary object for map display

### Visualization Features

#### `getDepthColor(depth)`
- **Purpose**: Assigns colors to depths based on predefined ranges
- **How it works**:
  1. Uses absolute depth value (ignoring negative signs)
  2. Maps depth ranges to specific colors using conditional logic
  3. Returns hex color code for visualization
  4. Uses green for deeper water, red for shallow water

```javascript
// This function assigns colors based on depth values
// Deep water (safer) gets green colors
// Shallow water (dangerous) gets red colors
const getDepthColor = (depth) => {
  const absDepth = Math.abs(depth);
  
  if (absDepth > 25) return '#00C853'; // Very deep - Bright Green
  if (absDepth > 20) return '#2E7D32'; // Deep - Dark Green
  if (absDepth > 15) return '#388E3C'; // Moderately deep - Green
  if (absDepth > 10) return '#689F38'; // Medium deep - Light Green
  if (absDepth > 7) return '#FDD835';  // Medium - Yellow
  if (absDepth > 5) return '#FFB300';  // Getting shallow - Orange
  if (absDepth > 3) return '#FF6F00';  // Shallow - Dark Orange
  if (absDepth > 1) return '#E65100';  // Very shallow - Red-Orange
  return '#B71C1C';                    // Extremely shallow - Dark Red
};
```

#### `drawCanvas()`
- **Purpose**: Renders sensor data on HTML canvas
- **How it works**:
  1. Clears the canvas and draws background
  2. Creates a grid system for reference
  3. Groups sensors by position to handle overlapping
  4. Draws each sensor with appropriate color and depth information
  5. Adds legend for depth reference

#### `latLngToCanvas(lat, lng)`
- **Purpose**: Converts geographic coordinates to canvas pixel coordinates
- **How it works**:
  1. Takes latitude and longitude values
  2. Maps them to x,y coordinates on the canvas based on current bounds
  3. Applies zoom and pan transformations
  4. Returns pixel coordinates for drawing

### User Interaction Handlers

#### `handleFileImport(e)`
- **Purpose**: Processes file uploads (CSV or Excel)
- **How it works**:
  1. Determines file type based on extension
  2. Uses appropriate library (Papa Parse or XLSX) to parse data
  3. Converts data to standard format
  4. Updates state with processed sensor data

#### `applyDateTimeFilter()`
- **Purpose**: Filters sensors based on date/time range
- **How it works**:
  1. Parses start and end date/time from user input
  2. Converts sensor timestamps to comparable format
  3. Filters sensors within the specified range
  4. Updates state to display only filtered sensors

#### Canvas Interaction Functions:
- `handleCanvasMouseDown`, `handleCanvasMouseMove`, `handleCanvasMouseUp`: Enable panning
- `handleMouseWheel`: Implements zooming centered on mouse position
- `handleZoomIn`, `handleZoomOut`: Provide button controls for zooming

### Export Functionality

#### `exportAsJPEG()`
- **Purpose**: Saves current visualization as JPEG image
- **How it works**:
  1. For canvas view: Uses canvas.toBlob() to capture the image
  2. For Google Maps: Uses html2canvas to screenshot the map element
  3. Creates download link and triggers browser download

#### `exportAsPDF()`
- **Purpose**: Generates PDF report with visualization and data table
- **How it works**:
  1. Captures visualization as image
  2. Creates HTML document with visualization and sensor data table
  3. Opens print dialog for saving as PDF

## Complete Data Flow Architecture

### 1. Application Initialization Flow
```
Application Start
      ↓
Component Mount (useEffect)
      ↓
Initialize State Variables
      ↓
Set up Event Listeners (resize, etc.)
      ↓
Render Initial UI (empty state)
```

### 2. Data Import Flow
```
User Selects File
      ↓
File Reader API reads content
      ↓
Detect file type (.csv or .xlsx)
      ↓
Parse with appropriate library (Papa Parse or XLSX)
      ↓
Normalize column names (trim, lowercase)
      ↓
Map to standard data structure
      ↓
Validate and filter invalid records
      ↓
Process sensor data (add display IDs, etc.)
      ↓
Update React state (setSensors, setFilteredSensors)
      ↓
Calculate bounds and update map view
      ↓
Trigger re-render of visualization components
```

### 3. Filtering Flow
```
User Sets Filter Criteria
      ↓
Parse date/time inputs
      ↓
Filter sensor array based on criteria
      ↓
Update filteredSensors state
      ↓
Recalculate bounds for filtered data
      ↓
Update visualization (map markers, canvas drawing)
      ↓
Update sensor summary statistics
```

### 4. Visualization Rendering Flow
```
State Change Detected
      ↓
React schedules re-render
      ↓
Component re-renders with new data
      ↓
If Google Maps: Update markers and info windows
      ↓
If Canvas: Clear and redraw all sensors
      ↓
Update legend and controls
      ↓
Update status bar information
```

### 5. Export Flow
```
User Clicks Export
      ↓
Determine view type (Google Maps or Canvas)
      ↓
If Google Maps: Use html2canvas to capture DOM
      ↓
If Canvas: Use canvas.toBlob() to get image
      ↓
Generate additional report data
      ↓
Create downloadable file (JPEG or PDF)
      ↓
Trigger browser download
```

## Technical Architecture Insights

### React State Management Strategy
The application uses multiple useState hooks for different concerns:

```javascript
// Data State
const [sensors, setSensors] = useState([]);              // Original imported data
const [filteredSensors, setFilteredSensors] = useState([]); // Filtered subset
const [allRecords, setAllRecords] = useState([]);        // Complete record history

// UI State  
const [selectedSensor, setSelectedSensor] = useState(null);   // Currently selected sensor
const [useGoogleMap, setUseGoogleMap] = useState(true);       // View mode toggle
const [windowWidth, setWindowWidth] = useState(window.innerWidth); // Responsive state

// Filter State
const [dateRange, setDateRange] = useState({...});       // Date/time filter criteria
const [isFilterActive, setIsFilterActive] = useState(false); // Filter status

// Visualization State
const [bounds, setBounds] = useState(null);              // Map boundaries
const [zoom, setZoom] = useState(1);                     // Canvas zoom level
const [pan, setPan] = useState({ x: 0, y: 0 });         // Canvas pan position
```

### Coordinate System Transformations
The application works with two coordinate systems:

1. **Geographic Coordinates (WGS84)**
   - Latitude: -90 to +90 degrees
   - Longitude: -180 to +180 degrees
   - Used for: Storing sensor positions, Google Maps API

2. **Screen Coordinates (Pixels)**
   - X: 0 to canvas.width
   - Y: 0 to canvas.height  
   - Used for: Canvas rendering, user interactions

```javascript
// Geographic to Screen coordinate conversion
const latLngToCanvas = (lat, lng) => {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width + padding;
  const y = canvas.height - (((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height + padding);
  
  return {
    x: x * zoom + pan.x,
    y: y * zoom + pan.y
  };
};
```

### Performance Optimization Strategies

1. **Memoization**
   ```javascript
   const mapCenter = useMemo(() => {
     if (!bounds) return { lat: 6.9300, lng: 79.9470 };
     return {
       lat: (bounds.minLat + bounds.maxLat) / 2,
       lng: (bounds.minLng + bounds.maxLng) / 2
     };
   }, [bounds]);
   ```

2. **Sensor Grouping**
   - Groups overlapping sensors to prevent rendering conflicts
   - Reduces canvas draw calls for better performance

3. **Responsive Design with Dynamic Breakpoints**
   ```javascript
   const [windowWidth, setWindowWidth] = useState(window.innerWidth);
   const isMobile = windowWidth <= 768;
   
   useEffect(() => {
     const handleResize = () => setWindowWidth(window.innerWidth);
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
   }, []);
   ```

4. **Conditional Rendering**
   - Only renders active view (Google Maps OR Canvas, not both)
   - Prevents unnecessary computations

## Development Best Practices Demonstrated

### React Best Practices Used

1. **Single Responsibility Components**
   - Each component has a clear, focused purpose
   - Main component orchestrates, child components handle specific UI elements

2. **Immutable State Updates**
   ```javascript
   // Correct way to update state
   setDateRange({...dateRange, startDate: e.target.value});
   
   // Avoid direct mutation
   // dateRange.startDate = e.target.value; // ❌ Wrong
   ```

3. **Effect Cleanup**
   ```javascript
   useEffect(() => {
     const handleResize = () => setWindowWidth(window.innerWidth);
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize); // Cleanup
   }, []);
   ```

4. **Conditional Rendering**
   ```javascript
   {useGoogleMap && isLoaded ? (
     <GoogleMap /* props */ />
   ) : (
     <canvas /* props */ />
   )}
   ```

### Error Handling Strategies

1. **Graceful Degradation**
   - Application continues working even with invalid data
   - Default values prevent crashes

2. **User-Friendly Error Messages**
   ```javascript
   setImportStatus('Error processing CSV file. Please check the format.');
   ```

3. **Data Validation at Import**
   ```javascript
   importedData = importedData.filter(record => 
     record.id && record.latitude !== 0 && record.longitude !== 0
   );
   ```

## Extending the Application

### Adding New Features - Step by Step

1. **Plan the Feature**
   - Define requirements and user stories
   - Identify state changes needed
   - Plan UI components required

2. **Add State Management**
   ```javascript
   const [newFeatureState, setNewFeatureState] = useState(initialValue);
   ```

3. **Create Handler Functions**
   ```javascript
   const handleNewFeature = (data) => {
     // Process data
     setNewFeatureState(processedData);
     // Update related states if needed
   };
   ```

4. **Add UI Components**
   ```javascript
   <button onClick={handleNewFeature}>
     New Feature
   </button>
   ```

5. **Update Visualization Logic**
   ```javascript
   useEffect(() => {
     // React to state changes
     if (newFeatureState) {
       updateVisualization();
     }
   }, [newFeatureState]);
   ```

### Example: Adding a New Sensor Type Filter

```javascript
// 1. Add state
const [sensorTypeFilter, setSensorTypeFilter] = useState('all');

// 2. Update filtering logic
const applyFilters = () => {
  let filtered = sensors;
  
  // Existing date filter
  if (dateRange.startDate) {
    filtered = filtered.filter(sensor => /* date logic */);
  }
  
  // New sensor type filter
  if (sensorTypeFilter !== 'all') {
    filtered = filtered.filter(sensor => sensor.type === sensorTypeFilter);
  }
  
  setFilteredSensors(filtered);
};

// 3. Add UI
<select value={sensorTypeFilter} onChange={(e) => setSensorTypeFilter(e.target.value)}>
  <option value="all">All Types</option>
  <option value="temperature">Temperature</option>
  <option value="pressure">Pressure</option>
</select>
```

## Common Questions & Detailed Answers

### Q: How are depths visualized and why this color scheme?
**A:** The application uses an inverted color scheme where:
- **Green colors** represent deeper water (safer for navigation)
- **Red colors** represent shallow water (potentially dangerous)
- **Color calculation** is based on absolute depth values with specific thresholds
- **Dynamic legend** updates based on the current dataset

### Q: How does the responsive design work?
**A:** The application uses a React-based responsive system:
```javascript
const [windowWidth, setWindowWidth] = useState(window.innerWidth);
const isMobile = windowWidth <= 768;

// Responsive styles
const styles = {
  container: {
    padding: isMobile ? '8px' : '16px'
  }
};
```

### Q: How is real-time filtering implemented?
**A:** The filtering system uses React's state management:
1. User input updates filter state
2. useEffect watches for filter changes
3. Filtering function processes the data
4. Filtered results update the display
5. Visualization components re-render automatically

### Q: What makes this different from other sensor visualization tools?
**A:** Key differentiators:
- **Dual visualization modes** (Google Maps + Custom Canvas)
- **Robust data import** with flexible column name handling
- **Mobile-responsive design** that works on all devices
- **Real-time filtering** without page reloads
- **Export capabilities** for both static images and PDF reports
- **Progressive Web App** potential for offline use

### Q: How does the canvas rendering work?
**A:** The custom canvas implementation:
1. **Coordinate transformation** converts lat/lng to pixel coordinates
2. **Sensor grouping** handles overlapping points
3. **Dynamic scaling** adjusts to different zoom levels
4. **Color coding** based on depth values
5. **Interactive elements** respond to mouse events
6. **Legend rendering** provides context for colors

### Q: How is data exported and why these formats?
**A:** Export functionality supports multiple formats:
- **JPEG**: Quick visual sharing, small file size
- **PDF**: Professional reports with data tables
- **Canvas export**: Direct pixel capture for custom views
- **Google Maps export**: DOM screenshot including map tiles
- **Data inclusion**: Tables with sensor details and statistics

This comprehensive approach ensures users can share visualizations in the format that best suits their needs.
