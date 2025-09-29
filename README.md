## Sensor Visualization System Setup Guide

### 1. Prerequisites

- Node.js (v18+ recommended)
- npm (comes with Node.js)
- VS Code installed
- (Optional for hosting) Git, a cloud server (e.g. VPS, Azure, AWS, or Vercel/Netlify for static hosting)

---

### 2. Clone the Repository

```sh
git clone https://github.com/ThuDu-SPD/sensor-visualization.git
cd sensor-visualization
```

---

### 3. Install Dependencies

```sh
npm install
```

---

### 4. Configure Environment Variables

Create a `.env.local` (or `.env`) file in the project root with:

```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_PORT=3000
```

Replace `your_google_maps_api_key` with your actual API key.

---

### 5. Run Locally in VS Code

- Open the folder in VS Code.
- Run the development server:

```sh
npm run dev
```

- Visit the local URL shown in the terminal (e.g. http://localhost:3000).

---

### 6. Deploy to a Host

#### Option A: Static Hosting (Vercel/Netlify)

1. Build the project:
	```sh
	npm run build
	```
2. Deploy the `dist` folder using your host’s instructions.
3. Set environment variables in the host’s dashboard.

#### Option B: VPS/Cloud Server

1. Upload your project to the server.
2. Install Node.js and npm.
3. Repeat steps 3–5 above.
4. (Optional) Use a process manager like PM2 to keep the app running.

---

### 7. Additional Notes

- Make sure your Google Maps API key is enabled for Maps JavaScript API.
- For production, use HTTPS and secure your API keys.
- You can use VS Code’s Remote SSH extension to edit files directly on your server.

---

You’re ready to go!
