# Courier Route Optimizer

A web-based application for courier delivery services that enables fast and easy package delivery through address scanning and intelligent route optimization.

## Features

- **Barcode/Address Scanning**: Scan package addresses directly using device camera or barcode scanner
- **Google Maps Integration**: Fetch real-time directions and route information
- **Route Optimization**: Automatically filter and sort delivery routes by distance from current location
- **GPS Tracking**: Real-time location tracking for delivery personnel
- **Multi-stop Route Planning**: Optimize routes for multiple packages
- **Delivery History**: Track completed deliveries
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **APIs**: Google Maps API, Geolocation API
- **Storage**: LocalStorage / IndexedDB
- **Barcode Scanner**: Quagga.js

## Quick Start

1. Clone the repository
```bash
git clone https://github.com/DRAKZO010/courier-route-optimizer.git
cd courier-route-optimizer
```

2. Get your Google Maps API Key from https://cloud.google.com/maps-platform

3. Open `index.html` in your browser or run a local server:
```bash
python -m http.server 8000
# or
npx http-server
```

4. Add your Google Maps API Key in the Settings page

## How to Use

1. **Grant Location Permission**: Allow browser to access your current location
2. **Scan Address**: Click "Scan Package" and use one of two methods:
   - **Barcode Scanner**: Scan QR codes or barcodes on packages
   - **Manual Entry**: Type in package details directly
3. **View Optimized Route**: System automatically calculates shortest route based on distance
4. **Start Delivery**: Follow the GPS-guided route to each delivery point
5. **Mark as Delivered**: Confirm delivery at each location

## File Structure

```
├── index.html              # Main application interface
├── README.md               # Documentation
├── css/
│   └── style.css          # Complete responsive styling
└── js/
    ├── config.js          # Configuration management
    ├── storage.js         # LocalStorage data management
    ├── maps.js            # Google Maps API integration
    ├── route.js           # Route optimization algorithm
    ├── scanner.js         # Barcode & address scanning
    └── app.js             # Main application logic
```

## Configuration

### Get Google Maps API Key

1. Go to https://cloud.google.com/maps-platform
2. Click "Get Started"
3. Select "Maps", "Routes", and "Places"
4. Create a new project
5. Enable the required APIs
6. Create an API key
7. Enter the key in the Settings page of the app

### Adjust Settings

- **Max Distance per Route**: Set maximum km for a single delivery route
- **Average Speed**: Used to calculate estimated delivery time
- **Enable Notifications**: Toggle delivery notifications
- **Auto-optimize Routes**: Automatically optimize when packages are added

## Features Explained

### 📱 Address Scanning

The app provides two methods to add packages:

1. **Barcode Scanner**: 
   - Uses Quagga.js to detect barcodes and QR codes
   - Real-time camera feed
   - Automatic package ID extraction

2. **Manual Entry**: 
   - Type package details directly
   - Supports address geocoding
   - Optional GPS coordinates

### 🗺️ Route Optimization

- **Nearest-Neighbor Algorithm**: Finds the closest package first
- **Distance-Based Sorting**: Orders deliveries by proximity
- **Route Grouping**: Splits routes by maximum distance threshold
- **Time Estimation**: Calculates ETA based on average speed
- **Visual Routes**: Shows all delivery points on map

### 📍 GPS Tracking

- **Real-time Location**: Shows current position on map
- **Distance Calculation**: Shows km to each delivery
- **Route Distance**: Total distance for entire delivery route
- **Estimated Time**: How long delivery will take

### 💾 Data Management

- **Local Storage**: All data saved in browser
- **Export Data**: Download packages, routes, and history as JSON
- **Import Data**: Restore from previously exported data
- **Delivery History**: Complete record of all deliveries

## Browser Support

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Mobile browsers with geolocation support

## Performance Tips

- Clear delivery history regularly to improve app performance
- Use manual entry for faster scanning when needed
- Enable auto-optimize in settings for automatic route updates
- For large numbers of packages (50+), split into multiple sessions

## Troubleshooting

### "Permission Denied" for Location
- Enable location services in your device settings
- Allow location access in browser permissions
- Try in a fresh incognito/private window

### Maps not showing
- Check your Google Maps API key is valid
- Ensure API is enabled in Google Cloud Console
- Check browser console (F12) for errors
- Verify API key has Maps, Routes, and Places APIs enabled

### Barcode not scanning
- Ensure good lighting conditions
- Hold camera steady for 2-3 seconds
- Make sure barcode is fully in frame
- Try different angles

### Routes not optimizing
- Ensure you have at least 2 packages added
- Check that your current location is detected
- Try manually entering coordinates if address geocoding fails
- Clear browser cache if experiencing issues

## Advanced Configuration

Edit `js/config.js` for advanced settings:

```javascript
const CONFIG = {
    GOOGLE_MAPS_API_KEY: 'your-key-here',
    MAX_PACKAGE_DISTANCE: 50,        // km
    AVERAGE_SPEED: 30,               // km/h
    REFRESH_INTERVAL: 5000,          // milliseconds
    ENABLE_NOTIFICATIONS: true,
    AUTO_OPTIMIZE_ROUTES: true,
    ENABLE_GPS_TRACKING: true
};
```

## API References

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Quagga.js Barcode Detection](https://serratus.github.io/quaggaJS/)

## License

MIT License - Feel free to use and modify

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please create an issue on GitHub.

## Future Enhancements

- [ ] Real-time traffic data integration
- [ ] Customer notifications via SMS/Email
- [ ] Proof of delivery (photo/signature)
- [ ] Multi-user/team management
- [ ] Backend API integration
- [ ] Advanced analytics and reporting
- [ ] Offline mode support
- [ ] Voice-guided navigation

---

**Made with ❤️ for fast and efficient courier deliveries**
