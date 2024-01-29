import { IS_MOBILE } from '../constants';
import L from 'leaflet';


export function createLeafletLocationControl(callback) {

  function GeolocationControl(){}

  GeolocationControl.prototype = new L.Control();

  GeolocationControl.prototype.onAdd = () => {
    let container = document.createElement('div');
    container.id = 'leaflet-geolocation-control';
    container.className = 'plugin-leaflet-geolocation-control leaflet-ctrl';
    let icon = document.createElement('i');
    icon.className = 'dtable-font dtable-icon-current-location';
    container.appendChild(icon);
    if (IS_MOBILE) {
      setNodeStyle(container, 'height: 35px; width: 35px; line-height: 35px; opacity: 0.75 ');
      setNodeStyle(icon, 'font-size: 20px');
    } else {
      setNodeStyle(container, 'height: 30px; width: 30px; line-height: 30px');
    }
    container.addEventListener('click', () => {
      if (window.navigator.geolocation) {
        window.navigator.geolocation.getCurrentPosition((position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          const point = { lng, lat };
          callback(null, point);
        }, (e) => {
          // Positioning failed
          callback(e, null);
        });
      }
    });
    return container;
  };

  GeolocationControl.prototype.onRemove = function () {
    const container = document.getElementById('leaflet-geolocation-control');
    container.parentNode.removeChild(container);
  };

  return GeolocationControl;
}

function setNodeStyle(dom, styleText) {
  dom.style.cssText += styleText;
}

