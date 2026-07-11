import intl from 'react-intl-universal';
import { toaster } from 'dtable-ui-component';

export function getCurrentBrowserPosition(options = {}) {
  if (!navigator.geolocation) {
    toaster.danger(intl.get('Browser_geolocation_not_supported'));
    return Promise.reject(new Error('Browser geolocation is not supported'));
  }

  const geolocationOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
    ...options,
  };

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        resolve({ lng: longitude, lat: latitude });
      },
      (error) => {
        let messageKey = 'Get_current_location_failed';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            messageKey = 'Location_permission_denied';
            break;
          case error.POSITION_UNAVAILABLE:
            messageKey = 'Current_location_unavailable';
            break;
          case error.TIMEOUT:
            messageKey = 'Geolocation_request_timed_out';
            break;
          default:
            break;
        }
        toaster.danger(intl.get(messageKey));
        reject(new Error(error.message || messageKey));
      },
      geolocationOptions,
    );
  });
}
