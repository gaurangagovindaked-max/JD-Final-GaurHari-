# 🕉️ Janmashtami Seva Real-Time Dashboard

A beautiful, real-time monitoring dashboard for Janmashtami Seva operations across multiple zones and departments.

## 🌟 Features

- **Real-time Updates**: Data refreshes every 2 seconds from Google Sheets
- **Multi-Department Monitoring**: LED/TV, Equipment, PA, and CCTV systems
- **Zone-based Organization**: 4 zones with multiple sectors each
- **Seamless UI**: No loading indicators, smooth transitions
- **Mobile Responsive**: Works perfectly on all devices
- **Status Color Coding**: Green for working, red for issues
- **Search & Filter**: Advanced filtering by status, zone, and search terms
- **No API Required**: Direct CSV export from Google Sheets

## 🏗️ Architecture

### Backend (Flask)
- Python Flask server with CORS enabled
- Background thread polling Google Sheets every 2 seconds
- Data caching for fast API responses
- CSV reading using pandas (no authentication required)
- RESTful API endpoints

### Frontend (HTML/CSS/JavaScript)
- Single Page Application (SPA) with client-side routing
- Black sidebar navigation with white main content
- Seamless data updates without loading indicators
- Responsive grid layouts
- Chart.js integration ready

## 📊 Data Sources

### Current Google Sheets
- **LED/TV Sheet**: [View Sheet](https://docs.google.com/spreadsheets/d/1-CnYZapqRr7NS2kJgt48vk9XfFFp5IO2Fphp5MNuh-8/edit?resourcekey=&gid=636068897#gid=636068897)
- **Equipment Sheet**: [View Sheet](https://docs.google.com/spreadsheets/d/1FAZx008XFihdOWz7rDFqTpOcVwn16YXRtYBkI6TFZQs/edit?resourcekey=&gid=2069921273#gid=2069921273)

### Zone & Sector Organization
```
Zone 1: Sector 1, Sector 2
Zone 2: Sector 3, Sector 4, Sector 5, Sector 6  
Zone 3: Sector 7, Sector 8, Sector 11
Zone 4: Sector 9, Sector 10
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Installation

1. **Clone or download the project**
   ```bash
   cd JD-FINAL
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the dashboard**
   ```bash
   python app.py
   ```

4. **Open your browser**
   ```
   http://localhost:5000
   ```

### Alternative Installation (Virtual Environment)

1. **Create virtual environment**
   ```bash
   python -m venv seva-dashboard
   seva-dashboard\Scripts\activate  # Windows
   # or
   source seva-dashboard/bin/activate  # Linux/Mac
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

## 📱 Pages Overview

### 🏠 Home Page
- Overview dashboard with 4 summary cards
- Real-time statistics for each department
- Zone status overview
- Clickable cards for navigation

### 📺 LED/TV Monitoring
- Real-time LED/TV system status
- Search and filter functionality
- Zone-based filtering
- Evidence links for issues

### 🔧 Equipment Monitoring
- Equipment status across all zones
- Location-based tracking
- Equipment type filtering
- Issue reporting integration

### 🎤 PA System (Future)
- Placeholder for PA system monitoring
- Ready for Google Sheet integration

### 📹 CCTV (Future)
- Placeholder for CCTV monitoring
- Ready for Google Sheet integration

## 🎨 Design Features

### Color Scheme
- **Sidebar**: Black (#1a1a1a) with white text
- **Main Content**: White (#ffffff) background
- **Accent**: Orange (#ff6b35) for highlights
- **Status Colors**: Green (working), Red (issues), Orange (critical)

### Responsive Design
- **Desktop**: Full sidebar visible (1200px+)
- **Tablet**: Collapsible sidebar (768px-1199px)
- **Mobile**: Overlay sidebar (<768px)

## 🔧 Configuration

### Google Sheets URLs
Update the CSV URLs in `app.py` if needed:
```python
LED_TV_CSV_URL = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=YOUR_GID"
EQUIPMENT_CSV_URL = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=YOUR_GID"
```

### Update Frequency
Change the update interval in `app.py`:
```python
time.sleep(2)  # Update every 2 seconds
```

## 📊 API Endpoints

- `GET /api/data` - Get all dashboard data
- `GET /api/data/led-tv` - Get LED/TV data only
- `GET /api/data/equipments` - Get Equipment data only
- `GET /api/data/pa` - Get PA data only
- `GET /api/data/cctv` - Get CCTV data only
- `GET /api/refresh` - Manual data refresh

## 🔍 Troubleshooting

### Common Issues

1. **"No data available"**
   - Check Google Sheets are publicly accessible
   - Verify CSV URLs are correct
   - Check internet connection

2. **"Connection Error"**
   - Ensure Google Sheets are shared publicly
   - Check firewall settings
   - Verify sheet IDs in URLs

3. **Dashboard not loading**
   - Check Python dependencies are installed
   - Verify Flask is running on port 5000
   - Check browser console for errors

### Debug Mode
Run with debug enabled:
```bash
python app.py
```
Debug mode is enabled by default in development.

## 🔒 Security Notes

- Google Sheets must be publicly accessible for CSV export
- No sensitive data should be stored in the sheets
- Consider implementing authentication for production use
- Use HTTPS in production environments

## 🚀 Production Deployment

### Using Gunicorn (Recommended)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Using Docker
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is created for Janmashtami Seva purposes. Use with devotion! 🙏

## 🙏 Acknowledgments

- Built with love for Krishna's service
- Inspired by the spirit of Seva
- Dedicated to all volunteers

---

**Hare Krishna! 🕉️**

For support or questions, please check the troubleshooting section or contact the development team.