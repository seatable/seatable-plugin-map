import { Loader } from '@googlemaps/js-api-loader';
import L from 'leaflet';
import {
  renderMarkByPosition, formatGeolocationValue, getInitialMapCenter, generateLabelContent, checkIsOverFreeCodingLocations, getRequiredCodingLocations, checkIsOverMaxCodingLocations,
} from '../utils/location-utils';
import 'leaflet.markercluster/dist/leaflet.markercluster-src';
import {
  IMAGE_PATH,
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
import { getTableColumnByName } from 'dtable-utils';
import { createLeafletLocationControl } from './locate-control';
import { toaster } from 'dtable-ui-component';

import './user-avatar.css';

L.Icon.Default.imagePath = IMAGE_PATH;

export class GoogleMap {

  constructor(props) {
    this.mapKey = props.mapKey;
    this.map = null;
    this.geocoder = null;
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
    this.cachedAddressGeocodingMap = {}; // { [address]: { lat, lng } }
  }

  loadMap = async () => {
    if (!this.mapKey) return;
    try {
      // only use geocoder of google map
      const loader = new Loader({
        apiKey: this.mapKey,
        version: 'weekly',
      });
      await loader.load();
      this.geocoder = new window.google.maps.Geocoder();
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
    const lang = pluginContext.getLanguage();
    const url = `https://mt0.google.com/vt/lyrs=m@160000000&hl=${lang}&gl=${lang}&src=app&y={y}&x={x}&z={z}&s=Ga`;
    if (!document.getElementsByClassName('map-container')) return;
    window.L = L;
    const { position, zoom } = await getInitialMapCenter(locations, this.geocoder);
    if (!this.map) {
      this.map = L
        .map('map-container', {
          center: position,
          zoom: zoom,
          maxBounds: [[-90, -180], [90, 180]],
          maxBoundsViscosity: 1.0 // prevent the user from dragging outside the bounds
        })
        .invalidateSize();
      L.tileLayer(url, {
        maxZoom: 18,
        minZoom: 2
      }).addTo(this.map);

      const handleLocate = (error, location) => {
        if (error) {
          this.errorHandler(error.message);
          return;
        }
        this.map.flyTo(location, 7, { animiate: true, duration: 1 });
      };
      const GeolocationControl = createLeafletLocationControl(handleLocate);
      const controller = new GeolocationControl();
      controller.setPosition('bottomright').addTo(this.map);
    }

    if (showUserLocation) {
      this.initUserLocationAvatar();
    }

    if (!this.handlerAdded && !IS_MOBILE) {
      this.addPanByHandler();
    }
  }

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
    const locationItem = locations[0] || {};
    const addressType = locationItem.type;
    if (!addressType) return;

    if (GEOCODING_FORMAT.includes(addressType)) {
      this.geocoding(locations, 1, 0, configSettings);
    } else {
      if (configSettings[0].active === MAP_MODE.IMAGE) {
        this.createMarkerCluster(locations, configSettings);
        return;
      }
      renderMarkByPosition(locations, this.addMarker, null, configSettings);
    }
  };

  createMarkerCluster = (locations, configSettings) => {
    if (!this.clusterMarkers) {
      this.clusterMarkers = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
          const markers = cluster.getAllChildMarkers();
          let imgCount = 0, markerUrl = '';
          markers.forEach((marker) => {
            const icon = marker.options.icon;
            const urls = icon.options.imgUrl;
            imgCount += urls.length;
            if (!markerUrl) {
              markerUrl = urls[0];
            }
          });
          const imageElement = `<img src=${markerUrl} width="72" height="72" />`;
          return L.divIcon({
            html: `
            <div class="map-plugin-custom-image-container">
              ${markerUrl ? imageElement : '<div class="map-plugin-empty-custom-image-wrapper"></div>'}
              <span class="map-plugin-custom-image-number">${imgCount}</span>
              <i class='plugin-map-image-label-arrow dtable-font dtable-icon-drop-down'></i>
            </div>
          `,
            iconAnchor: [48, 55],
          });
        },
        showCoverageOnHover: false
      });
    }
    this.clusterMarkers.clearLayers();
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
      if (lng && lat) {
        const imageElement = `<img src=${imageUrlList[0]} width="72" height="72" />`;
        const htmlString = `
          <div class="map-plugin-custom-image-container">
            ${imageUrlList.length > 0 ? `<span class="map-plugin-custom-image-number">${imageUrlList.length}</span> ${imageElement}` : '<div class="map-plugin-empty-custom-image-wrapper"></div>'}
            <i class='plugin-map-image-label-arrow dtable-font dtable-icon-drop-down'></i>
          </div>
        `;
        let markIcon = L.divIcon({
          html: htmlString,
          imgUrl: imageUrlList,
          iconAnchor: [48, 55],
        });
        let marker = new L.Marker([lat, lng], { icon: markIcon });
        list.push(marker);
      }
    });
    this.clusterMarkers.addLayers(list);
    this.map.addLayer(this.clusterMarkers);
  };

  geocodingCallback = ({ lat, lng, mapMode, currentLocation, locations, index, address, configSettings }) => {
    if (mapMode === MAP_MODE.IMAGE) {
      this.geocodingLocations.push({ ...currentLocation, location: { lat, lng } });
    } else {
      this.addMarker(currentLocation, lat, lng, address, configSettings);
    }
    this.geocoding(locations, 1, ++index, configSettings);
  };

  geocoding = (locations, resolutionTimes, index, configSettings) => {
    const locationItem = locations[index];
    if (!locationItem) {
      this.createMarkerCluster(this.geocodingLocations, configSettings);
      return;
    }
    let address;
    const value = locationItem.location;
    if (GEOCODING_FORMAT.includes(locationItem.type) && typeof value === 'object') {
      address = formatGeolocationValue(value, locationItem.type);
    } else {
      address = locationItem.location;
    }
    if (!address) {
      this.geocoding(locations, 1, ++index, configSettings);
      return;
    }

    const activeColumn = configSettings[3].active;
    const mapMode = configSettings[0].active;

    // try to geocoding via cache
    if (this.cachedAddressGeocodingMap[address]) {
      const { lat, lng } = this.cachedAddressGeocodingMap[address];
      this.geocodingCallback({
        lat, lng, mapMode, locations, index, address, configSettings,
        currentLocation: locationItem,
      });
      return;
    }

    // try to geocoding via google map
    this.geocoder.geocode({ 'address': address }, (points, status) => {
      if (locationItem.columnName !== activeColumn) return;
      switch (status) {
        case window.google.maps.GeocoderStatus.OK: {
          const lat = points[0].geometry.location.lat();
          const lng = points[0].geometry.location.lng();
          this.cachedAddressGeocodingMap[address] = { lat, lng };
          this.geocodingCallback({
            lat, lng, mapMode, locations, index, address, configSettings,
            currentLocation: locationItem,
          });
          break;
        }
        case window.google.maps.GeocoderStatus.OVER_QUERY_LIMIT: {
          this.timer = setTimeout(() => {
            clearTimeout(this.timer);
            this.timer = null;
            if (resolutionTimes < 3) {
              this.geocoding(locations, ++resolutionTimes, index, configSettings);
            } else {
              // eslint-disable-next-line no-console
              console.log(intl.get('Your_Google_Maps_key_has_exceeded_quota'));
              this.geocoding(locations, 1, ++index, configSettings);
            }
          }, resolutionTimes * 1000);
          break;
        }
        case window.google.maps.GeocoderStatus.UNKNOWN_ERROR:
        case window.google.maps.GeocoderStatus.ERROR: {
          this.timer = setTimeout(() => {
            clearTimeout(this.timer);
            this.timer = null;
            this.geocoding(locations, 0, index, configSettings);
          }, 1000);
          break;
        }
        case window.google.maps.GeocoderStatus.INVALID_REQUEST:
        case window.google.maps.GeocoderStatus.REQUEST_DENIED: {
          break;
        }
        default: {
          // eslint-disable-next-line no-console
          console.log(intl.get('address_was_not_found', { address: address }));
          break;
        }
      }
    });
  };

  removeLayers = () => {
    if (this.markers.length > 0) {
      this.markers.forEach((m) => {
        m.remove();
      });
      this.markers = [];
    }
  };

  clearClusterMarkers = () => {
    if (this.clusterMarkers) {
      this.clusterMarkers.clearLayers();
    }
  };

  getRowByConfigSettings = (cfgSettings, rowId) => {
    const tableName = getConfigItemByType(cfgSettings, 'table').active;
    const currentTable = pluginContext.getTableByName(tableName);
    const row = pluginContext.getRow(currentTable, rowId);
    return row;
  };

  addMarker = (location, lat, lng, address, configSettings) => {
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

    const tooltipLabelContent = generateLabelContent(location);
    let myIcon;
    if (mapMode === MAP_MODE.DEFAULT || mapMode === 'Default map') {
      if (color) {
        const colorIndex = COLORS.findIndex((item) => color === item.COLOR);
        if (colorIndex > -1) {
          myIcon = L.icon({
            iconUrl: [image['image' + (colorIndex + 1)]],
            iconSize: [25, 41],
          });
        } else {
          myIcon = L.icon({
            iconUrl: [image['marker']],
            iconSize: [25, 41],
          });
        }
      } else {
        myIcon = L.icon({
          iconUrl: [image['marker']],
          iconSize: [25, 41],
        });
      }
      let marker = new L.Marker([lat, lng], { icon: myIcon, riseOnHover: true });
      if (!marker || !this.map) return;

      if (directShownLabel) {
        marker.bindTooltip(directShownLabel, {
          direction: 'right',
          permanent: true,
          offset: L.point(14, 0),
          opacity: 1,
          className: 'plugin-en-tooltip'
        }).openTooltip();
      }

      if (IS_MOBILE) {
        marker.addEventListener('touchend', () => {
          eventBus.dispatch(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, marker.getLatLng());
        });
        marker.on('click', () => {
          eventBus.dispatch(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, marker.getLatLng());
        });
      } else {
        marker.bindPopup(tooltipLabelContent);
        marker.on('mouseover', () => {
          marker.openPopup();
        });
        marker.on('mouseout', () => {
          marker.closePopup();
        });
        marker.on('click', () => {
          eventBus.dispatch(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, marker.getLatLng());
        });
        this.map.addEventListener('click', () => {
          eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_LOCATION_DETAILS);
        });
      }

      this.markers.push(marker);
      this.map.addLayer(marker);
    }
  };

  addPanByHandler = () => {
    const up = document.getElementsByClassName('up-hover')[0];
    const down = document.getElementsByClassName('down-hover')[0];
    const left = document.getElementsByClassName('left-hover')[0];
    const right = document.getElementsByClassName('right-hover')[0];
    up.onclick = () => { this.map.panBy([0, -100]); };
    down.onclick = () => this.map.panBy([0, 100]);
    left.onclick = () => this.map.panBy([-100, 0]);
    right.onclick = () => this.map.panBy([100, 0]);
    this.handlerAdded = true;
  };

  useGeocoder = async (latlng, cb) => {
    if (!this.geocoder) {
      this.geocoder = new window.google.maps.Geocoder();
    }
    const lang = pluginContext.getLanguage();
    let res = { results: [] };
    try {
      res = await this.geocoder.geocode({ 'location': latlng, language: lang });
    } catch (err) {
      console.log('geocodeError: ', err);
    }
    // call the cbs
    if (cb) {
      cb(res);
    }
    return res;
  };

  addUserAvatarMarker = () => {
    this.userAvatarMarker.addTo(this.map);
    this.map.flyTo({ ...this.userLocationCoords }, 5, { animiate: true, duration: 1 });
  };

  removeUserAvatarMarker = () => {
    this.map.removeLayer(this.userAvatarMarker);
  };

  loadUserAvatarMarker = () => {
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="plugin-map-en-avatar-marker"><img class='plugin-map-en-avatar' src="${this.userInfo.avatar_url}"></div>`,
      iconAnchor: [10, 10]
    });

    this.userAvatarMarker = L.marker([this.userLocationCoords.lat, this.userLocationCoords.lng], { icon: customIcon });
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

  resetUserLocationMarker = async (isShowMarker) => {
    if (isShowMarker) {
      try {
        if (!this.userAvatarMarker) {
          const result = await pluginContext.getUserCommonInfo();
          this.userInfo = result.data;
          await this.getUserLocation();
          this.loadUserAvatarMarker(this.userInfo.avatar_url);
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
      this.loadUserAvatarMarker(this.userInfo.avatar_url);
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
