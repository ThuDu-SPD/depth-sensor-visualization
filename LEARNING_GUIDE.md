# Sensor Visualization System - Learning Guide

## Introduction

This document provides a detailed explanation of how the Sensor Visualization System works. It's designed for people with no prior knowledge of the codebase, helping you understand the key components, libraries, and functionality.

## Project Overview

The Sensor Visualization System is a web application that displays sensor data on both Google Maps and a custom canvas. It allows users to:

1. Import sensor data from CSV or Excel files
2. View sensors with depth information on a map
3. Filter sensor data by date/time
4. Export visualizations as JPEG or PDF reports
5. Analyze sensor depth readings with color-coded indicators

## Key Libraries and Their Purpose

### React and React DOM
- **Purpose**: The foundation of our user interface
- **Why**: Provides component-based architecture for building interactive UIs efficiently

### @react-google-maps/api
- **Purpose**: Integrates Google Maps into our React application
- **Why**: Offers React components for Google Maps, making it easier to create map-based visualizations

### XLSX and Papa Parse
- **Purpose**: Parse Excel (.xlsx) and CSV files
- **Why**: Allows users to import sensor data from common file formats

### html2canvas
- **Purpose**: Capture screenshots of DOM elements (including Google Maps)
- **Why**: Enables export functionality for the Google Maps view

### Lucide React
- **Purpose**: Provides icon components
- **Why**: Enhances UI with consistent, professional icons

## Core Components

### Main Component: SensorVisualization

This component orchestrates the entire application, managing state and rendering the UI. It contains all the functionality for visualization, data processing, and user interactions.

## Key Functions Explained

### Data Processing

#### `excelDateToJS(serial)`
- **Purpose**: Converts Excel's date format to JavaScript Date
- **How it works**: 
  1. Excel dates are stored as serial numbers (days since Jan 1, 1900)
  2. The function extracts date and time components
  3. It formats them into a standard date string

```javascript
// Excel's date system counts days since January 1, 1900
// This function converts Excel's numeric date format to a JavaScript Date
const excelDateToJS = (serial) => {
  if (typeof serial === 'string') return serial;
  
  // Calculate days since Unix epoch (Jan 1, 1970)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;  // seconds in a day
  const date_info = new Date(utc_value * 1000);  // milliseconds
  
  // Extract fractional day and convert to time components
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  
  // Format the date string
  const month = date_info.getMonth() + 1;
  const day = date_info.getDate();
  const year = date_info.getFullYear();
  
  return `${month}/${day}/${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

## Data Flow

1. **Data Import**: CSV/Excel → Parsed → Processed → State Storage
2. **Visualization**: State Data → Filtering → Rendering (Canvas or Google Maps)
3. **User Interaction**: User Actions → State Updates → Re-rendering
4. **Export**: Current View → Image Capture → File Generation

## Technical Insights

### State Management
The application uses React's useState hooks to manage:
- Sensor data and filtered subsets
- Visualization settings (zoom, pan, bounds)
- UI state (selected sensor, filter settings)

### Coordinate Systems
Two coordinate systems are used:
1. **Geographic coordinates**: Latitude and longitude for storing actual positions
2. **Canvas coordinates**: Pixel positions calculated for canvas drawing

### Performance Considerations
- Sensor grouping to handle overlapping data points
- Efficient canvas rendering with appropriate optimizations
- Dynamic calculation of bounds and zoom levels

## Extending the Application

To add new features:
1. Add necessary state variables in the main component
2. Create handler functions for new functionality
3. Add UI elements to the render function
4. Update visualization logic as needed

## Common Questions

### How are depths visualized?
Depths are visualized through color coding and numeric labels. Deeper water (safer) is represented with green colors, while shallow water (dangerous) is shown with red colors.

### How does filtering work?
The filtering system converts all timestamps to JavaScript Date objects for comparison, then filters the dataset based on the user-specified date/time range.

### How is the canvas map different from Google Maps?
- **Canvas**: Custom rendering with more control over appearance, better for simple visualizations
- **Google Maps**: Real-world context with satellite imagery, street views, and familiar navigation

### How is data exported?
- For canvas view: Direct canvas capture using built-in methods
- For Google Maps: DOM capture using html2canvas library
- Both are then processed into downloadable files (JPEG) or printable documents (PDF)
