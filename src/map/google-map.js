import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import {
  renderMarkByPosition, formatGeolocationValue, getInitialMapCenter, generateLabelContent, checkIsOverFreeCodingLocations, getRequiredCodingLocations, checkIsOverMaxCodingLocations,
} from '../utils/location-utils';
import { toaster } from 'dtable-ui-component';
import { getTableColumnByName, isNumber } from 'dtable-utils';
import {
  GEOCODING_FORMAT,
  MAP_MODE,
  EVENT_BUS_TYPE,
  IS_MOBILE,
} from '../constants';
import getConfigItemByType from '../utils/get-config-item-by-type';
import COLORS from '../marker-color';
import * as image from '../image/index';
import intl from 'react-intl-universal';
import { eventBus } from '../utils/event-bus';
import pluginContext from '../plugin-context';
import dtableWebProxyAPI from '../api/dtable-web-proxy-api';

import './user-avatar.css';

const APP_GOOGLE_MAP_ID = 'APP_GOOGLE_MAP_ID';

export class GoogleMap {

  constructor(props) {
    this.mapKey = props.mapKey;
    this.map = null;
    this.markerClusterer = null;
    this.errorHandler = props.errorHandler;

    this.userAvatarMarker = null;
    this.userLocationCoords = null;

    this.markers = [];
    this.timer = null;
    this.clusterMarkers = null;
    this.geocodingLocations = [];
    this.sameLocationList = {};
    this.userInfo = null;
    this._infoWindow = null;
    this.cachedAddressGeocodingMap = {}; // { [address]: { lat, lng } }
    this.cachedLatLngGeocodingMap = {}; // { lat_lng: address }

    this._Map = null;
    this._InfoWindow = null;
    this._ControlPosition = null;
    this._AdvancedMarkerElement = null;
  }

  loadMap = async () => {
    if (!this.mapKey) return;
    try {
      setOptions({
        key: this.mapKey,
        version: 'weekly',
      });
      const { Map, InfoWindow } = await importLibrary('maps');
      const { AdvancedMarkerElement } = await importLibrary('marker');
      this._Map = Map;
      this._InfoWindow = InfoWindow;
      this._ControlPosition = window.google.maps.ControlPosition;
      this._AdvancedMarkerElement = AdvancedMarkerElement;
    } catch (err) {
      console.log(err);
      let errMessage;
      if (typeof err !== 'string') {
        errMessage = err.message || JSON.stringify(err);
      }
      this.errorHandler(errMessage);
    }
  };

  async renderMap(locations, showUserLocation) {
    const containerEl = document.getElementById('map-container');
    if (!containerEl) return;
    const { position, zoom } = await getInitialMapCenter(locations);
    const center = { lat: position[0], lng: position[1] };

    if (!this.map) {
      this.map = new this._Map(containerEl, {
        center,
        zoom,
        mapId: APP_GOOGLE_MAP_ID,
        minZoom: 2,
        maxZoom: 18,
        restriction: {
          latLngBounds: { north: 85, south: -85, west: -180, east: 180 },
          strictBounds: true,
        },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        keyboardShortcuts: false,
        disableDefaultUI: true,
      });

      this._infoWindow = new this._InfoWindow();
      this._addGeolocationControl();
      this._addZoomControl();
    }

    if (showUserLocation) {
      this.initUserLocationAvatar();
    }

    if (!this.handlerAdded && !IS_MOBILE) {
      this.addPanByHandler();
    }
  }

  _addGeolocationControl = () => {
    const container = document.createElement('div');
    container.className = 'plugin-leaflet-geolocation-control';
    const icon = document.createElement('i');
    icon.className = 'dtable-font dtable-icon-current-location';
    container.appendChild(icon);
    if (IS_MOBILE) {
      container.style.cssText = 'height:35px;width:35px;line-height:35px;opacity:0.75;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:10px';
      icon.style.fontSize = '20px';
    } else {
      container.style.cssText = 'height:30px;width:30px;line-height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:10px';
    }
    container.addEventListener('click', () => {
      this.getLocationByGoogle()
        .then((point) => {
          if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
            this.userLocationCoords = { ...point };
            if (this.userAvatarMarker) {
              this.userAvatarMarker.setMap(null);
              this.userAvatarMarker = null;
            }
            if (this.userInfo) {
              this.loadUserAvatarMarker();
              this.addUserAvatarMarker();
            }
          }
        })
        .catch((e) => {
          this.errorHandler(e.message);
        });
    });
    this.map.controls[this._ControlPosition.RIGHT_BOTTOM].push(container);
  };

  _addZoomControl = () => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;margin:0 10px 10px 0;background-color:#fff;box-shadow:0 0 4px rgb(0 0 0 / 12%);border-radius:4px;overflow:hidden;';

    const btnStyle = 'width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:bold;user-select:none;color:#212529;';

    const zoomIn = document.createElement('div');
    zoomIn.style.cssText = btnStyle + 'border-bottom:1px solid #e0e0e0;';
    zoomIn.textContent = '+';
    zoomIn.addEventListener('click', () => {
      this.map.setZoom(this.map.getZoom() + 1);
    });
    zoomIn.addEventListener('mouseenter', () => { zoomIn.style.backgroundColor = '#f5f5f5'; });
    zoomIn.addEventListener('mouseleave', () => { zoomIn.style.backgroundColor = ''; });

    const zoomOut = document.createElement('div');
    zoomOut.style.cssText = btnStyle;
    zoomOut.textContent = '−';
    zoomOut.addEventListener('click', () => {
      this.map.setZoom(this.map.getZoom() - 1);
    });
    zoomOut.addEventListener('mouseenter', () => { zoomOut.style.backgroundColor = '#f5f5f5'; });
    zoomOut.addEventListener('mouseleave', () => { zoomOut.style.backgroundColor = ''; });

    wrapper.appendChild(zoomIn);
    wrapper.appendChild(zoomOut);
    this.map.controls[this._ControlPosition.RIGHT_BOTTOM].push(wrapper);
  };

  renderLocations = (locations, configSettings) => {
    // clear previous layers
    this.removeLayers();
    this.clearClusterMarkers();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const requiredCodingLocations = getRequiredCodingLocations(locations);
    if (checkIsOverFreeCodingLocations(requiredCodingLocations)) {
      toaster.danger(intl.get('Exceeded_the_free_locations_limit'));
      return;
    }
    if (checkIsOverMaxCodingLocations(requiredCodingLocations)) {
      toaster.danger(intl.get('Exceeded_the_max_locations_limit'));
      return;
    }

    this.geocodingLocations = [];
    this.sameLocationList = {};
    const locationItem = locations[0] || {};
    const addressType = locationItem.type;
    if (!addressType) return;

    if (GEOCODING_FORMAT.includes(addressType)) {
      this.geocoding(locations, configSettings);
    } else {
      if (configSettings[0].active === MAP_MODE.IMAGE) {
        this.createMarkerCluster(locations, configSettings);
        return;
      }
      renderMarkByPosition(locations, this.addMarker, null, configSettings);
    }
  };

  createMarkerCluster = (locations, configSettings) => {
    const list = [];
    const tableName = getConfigItemByType(configSettings, 'table').active;
    const currentTable = pluginContext.getTableByName(tableName);

    locations.forEach((item) => {
      const row = pluginContext.getRow(currentTable, item.rowId);
      const imageColumn = getTableColumnByName(currentTable, item.imageColumnName);
      const imageUrlList = (imageColumn?.key && row[imageColumn.key]) || [];
      item.imgUrl = imageUrlList;
      const { location } = item;
      const { lat, lng } = location;
      if (!lng || !lat) return;

      const imgSrc = imageUrlList[0] || '';
      const markerEl = document.createElement('div');
      markerEl.className = 'map-plugin-custom-image-container';
      markerEl.innerHTML = imgSrc
        ? `<img src="${imgSrc}" width="72" height="72" /><span class="map-plugin-custom-image-number">${imageUrlList.length}</span><i class='plugin-map-image-label-arrow dtable-font dtable-icon-drop-down'></i>`
        : '<div class="map-plugin-empty-custom-image-wrapper"></div><i class=\'plugin-map-image-label-arrow dtable-font dtable-icon-drop-down\'></i>';

      const marker = new this._AdvancedMarkerElement({
        position: { lat: Number(lat), lng: Number(lng) },
        content: markerEl,
        map: this.map,
      });
      list.push(marker);
      this.markers.push(marker);
    });

    if (list.length > 0) {
      this.clusterMarkers = new MarkerClusterer({ map: this.map, markers: list });
    }
  };

  geocodingCallback = ({ convertedLocation, mapMode, configSettings }) => {
    if (mapMode === MAP_MODE.IMAGE) {
      this.geocodingLocations.push(convertedLocation);
    } else {
      const { lat, lng } = convertedLocation.location;
      this.addMarker(convertedLocation, lat, lng, convertedLocation.address, configSettings);
    }
  };

  geocodingAddresses(locations, mapMode, configSettings) {
    let waitingGeocodingLocations = [];
    locations.forEach((location) => {
      let address;
      if (GEOCODING_FORMAT.includes(location.type) && typeof location.location === 'object') {
        address = formatGeolocationValue(location.location, location.type);
      } else {
        address = location.location;
      }
      if (address) {
        if (this.cachedAddressGeocodingMap[address]) {
          // try to geocoding via cache
          const { lat, lng } = this.cachedAddressGeocodingMap[address];
          this.geocodingCallback({
            convertedLocation: { ...location, address, location: { lat, lng } },
            mapMode,
            configSettings,
          });
        } else {
          // waiting to geocoding
          waitingGeocodingLocations.push({ ...location, address });
        }
      }
    });

    // try to geocoding
    const asyncConvert = async () => {
      if (waitingGeocodingLocations.length > 0) {
        const currentGeocodingLocations = waitingGeocodingLocations.splice(0, 5);
        const currentGeocodingAddresses = currentGeocodingLocations.map((location) => location.address);
        const res = await dtableWebProxyAPI.addressConvert(currentGeocodingAddresses);
        const { result } = (res && res.data) || {};
        if (Array.isArray(result) && result.length > 0) {
          currentGeocodingLocations.forEach((location, index) => {
            const { lat, lng } = result[index] || {};
            if (isNumber(lat) && isNumber(lng)) {
              this.cachedAddressGeocodingMap[location.address] = { lat, lng };
              this.geocodingCallback({
                convertedLocation: { ...location, address: location.address, location: { lat, lng } },
                mapMode,
                configSettings,
              });
            }
          });
        }
        asyncConvert();
      } else {
        this.createMarkerCluster(this.geocodingLocations, configSettings);
      }
    };
    asyncConvert();
  }

  geocoding = (locations, configSettings) => {
    const mapMode = configSettings[0].active;
    this.geocodingAddresses(locations, mapMode, configSettings);
  };

  removeLayers = () => {
    if (this.markers.length > 0) {
      this.markers.forEach((m) => {
        m.setMap(null);
      });
      this.markers = [];
    }
  };

  clearClusterMarkers = () => {
    if (this.clusterMarkers) {
      this.clusterMarkers.clearMarkers();
      this.clusterMarkers = null;
    }
  };

  getRowByConfigSettings = (cfgSettings, rowId) => {
    const tableName = getConfigItemByType(cfgSettings, 'table').active;
    const currentTable = pluginContext.getTableByName(tableName);
    const row = pluginContext.getRow(currentTable, rowId);
    return row;
  };

  addMarker = (location, lat, lng, _address, configSettings) => {
    const { color, directShownLabel, mapMode } = location;

    const row = this.getRowByConfigSettings(configSettings, location.rowId);
    // do not render marker of same location
    let existsPoint = this.sameLocationList['' + lat + lng];
    if (!existsPoint) {
      existsPoint = [row];
      this.sameLocationList['' + lat + lng] = existsPoint;
    } else {
      existsPoint.push(row);
    }

    // create only one marker for same location
    if (existsPoint.length > 1) return;

    if (mapMode !== MAP_MODE.DEFAULT && mapMode !== 'Default map') return;

    const tooltipLabelContent = generateLabelContent(location);

    // Build marker icon element
    const colorIndex = color ? COLORS.findIndex((item) => color === item.COLOR) : -1;
    const iconUrl = colorIndex > -1 ? image['image' + (colorIndex + 1)] : image['marker'];

    const markerEl = document.createElement('div');
    markerEl.style.cssText = 'width:25px;height:41px;cursor:pointer';
    const img = document.createElement('img');
    img.src = Array.isArray(iconUrl) ? iconUrl[0] : iconUrl;
    img.style.cssText = 'width:25px;height:41px';
    markerEl.appendChild(img);

    if (directShownLabel) {
      const label = document.createElement('span');
      label.className = 'plugin-en-tooltip googlemap-label-tooltip';
      label.innerHTML = directShownLabel;
      markerEl.style.position = 'relative';
      markerEl.appendChild(label);
    }

    const marker = new this._AdvancedMarkerElement({
      position: { lat, lng },
      content: markerEl,
      map: this.map,
    });

    if (IS_MOBILE) {
      marker.addListener('click', () => {
        eventBus.dispatch(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, { lng, lat });
      });
    } else {
      marker.addListener('click', () => {
        eventBus.dispatch(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, { lng, lat });
      });
      img.addEventListener('mouseenter', () => {
        const container = document.createElement('div');
        container.innerHTML = tooltipLabelContent;
        this._infoWindow.setContent(container);
        this._infoWindow.open({ anchor: marker, map: this.map });
      });
      img.addEventListener('mouseleave', () => {
        this._infoWindow.close();
      });
      this.map.addListener('click', () => {
        eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_LOCATION_DETAILS);
      });
    }

    this.markers.push(marker);
  };

  addPanByHandler = () => {
    const up = document.getElementsByClassName('up-hover')[0];
    const down = document.getElementsByClassName('down-hover')[0];
    const left = document.getElementsByClassName('left-hover')[0];
    const right = document.getElementsByClassName('right-hover')[0];
    up.onclick = () => { this.map.panBy(0, -100); };
    down.onclick = () => this.map.panBy(0, 100);
    left.onclick = () => this.map.panBy(-100, 0);
    right.onclick = () => this.map.panBy(100, 0);
    this.handlerAdded = true;
  };

  useGeocoder = async (latlng, cb) => {
    const { lat, lng } = latlng;
    const strLatLng = `${lat}, ${lng}`;
    if (this.cachedLatLngGeocodingMap[strLatLng]) {
      return this.cachedLatLngGeocodingMap[strLatLng];
    }
    const lang = pluginContext.getLanguage();
    let address = '';
    try {
      const res = await dtableWebProxyAPI.locationConvert([strLatLng], lang);
      const { result } = (res && res.data) || {};
      if (Array.isArray(result)) {
        address = result[0] || '';
        if (address) {
          this.cachedLatLngGeocodingMap[strLatLng] = address;
        }
      }
    } catch (err) {
      console.log('geocodeError: ', err);
    }
    if (cb) {
      cb(address);
    }
    return address;
  };

  addUserAvatarMarker = () => {
    this.userAvatarMarker.setMap(this.map);
    this.map.panTo({ lat: this.userLocationCoords.lat, lng: this.userLocationCoords.lng });
  };

  removeUserAvatarMarker = () => {
    if (this.userAvatarMarker) {
      this.userAvatarMarker.setMap(null);
    }
  };

  loadUserAvatarMarker = () => {
    const el = document.createElement('div');
    el.className = 'plugin-map-en-avatar-marker';
    const img = document.createElement('img');
    img.className = 'plugin-map-en-avatar';
    img.src = this.userInfo.avatar_url;
    el.appendChild(img);

    this.userAvatarMarker = new this._AdvancedMarkerElement({
      position: { lat: this.userLocationCoords.lat, lng: this.userLocationCoords.lng },
      content: el,
    });
  };

  getUserLocation = () => {
    if (!navigator.geolocation) return Promise.reject(intl.get('Not_support_geo'));
    // use GPS
    const getOptions = { enableHighAccuracy: true };
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          this.userLocationCoords = { lng: longitude, lat: latitude };
          resolve();
        },
        reject,
        getOptions
      );
    });
  };

  getLocationByGoogle = async () => {
    const endpoint = `https://www.googleapis.com/geolocation/v1/geolocate?key=${this.mapKey}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ considerIp: true })
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Google Geolocation failed: ${resp.status} ${text}`);
    }
    const data = await resp.json();
    const { location } = data || {};
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      throw new Error('Invalid geolocation response');
    }
    return { lat: location.lat, lng: location.lng };
  };

  resetUserLocationMarker = async (isShowMarker) => {
    if (isShowMarker) {
      try {
        if (!this.userAvatarMarker) {
          const result = await pluginContext.getUserCommonInfo();
          this.userInfo = result.data;
          await this.getUserLocation();
          this.loadUserAvatarMarker();
        }
        this.addUserAvatarMarker();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    } else {
      this.removeUserAvatarMarker();
    }
  };

  async initUserLocationAvatar() {
    try {
      const result = await pluginContext.getUserCommonInfo();
      this.userInfo = result.data;
      await this.getUserLocation();
      this.loadUserAvatarMarker();
      this.addUserAvatarMarker();
    } catch (err) {
      let errMessage;
      if (typeof err !== 'string') {
        errMessage = err.message || JSON.stringify(err);
      }
      this.errorHandler(errMessage);
      throw err;
    }
  }

}
