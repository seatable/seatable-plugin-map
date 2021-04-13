import getConfigItemByType from './get-config-item-by-type';

const getMarkColor = (markColumn, row) => {
  const key = markColumn.key;
  if (!markColumn.data) return '';
  const options = markColumn.data.options;
  if (!options) return '';
  
  const currentOption = options.find((option) => {
    return option.id === row[key];
  });
  if (!currentOption) return ''
  return currentOption.color;
}

export const getLocations = (dtable, configSettings) => {
  let locations = [];
  const tableName = getConfigItemByType(configSettings, 'table').active;
  const viewName = getConfigItemByType(configSettings, 'view').active;
  let currentTable = dtable.getTableByName(tableName);
  let currentView = dtable.getViewByName(currentTable, viewName);
  const columnName = getConfigItemByType(configSettings, 'column').active;
  let currentColumn = dtable.getColumnByName(currentTable, columnName);
  const markColumnName = getConfigItemByType(configSettings, 'mark_column').active;
  const currentMarkColumn = dtable.getColumnByName(currentTable, markColumnName);
  let locationNameKey = currentTable.columns[0].key;
  let rows = currentTable.rows;
  if (!currentColumn) {
    return [];
  }

  if (currentView.rows.length > 0) {
    // get view's rows and filtered null object
    rows = currentView.rows.map(rowId => currentTable['id_row_map'][rowId]).filter(Boolean);
  }

  if (rows.length === 0) return [];

  const columnData = currentColumn.data || {};
  let addressType = columnData.geo_format || 'geolocation';
  let locationValueKey = currentColumn.key;

  rows.forEach(row => {
    const color = currentMarkColumn ? getMarkColor(currentMarkColumn, row) : '';
    const value = row[locationValueKey] || {};
    locations.push({
      type: addressType,
      location: value,
      name: row[locationNameKey] || '',
      color,
      columnName,
    });
  });
  return locations;
}

export const renderMarkByPosition = (locations, renderer, start = 0) => {
  let stack = locations.slice(start, start += 10);
  if (stack.length === 0) return;

  setTimeout(() => {
    stack.forEach((location) => {
      const position = location.location;
      if (Number(position.lng) && Number(position.lat)) {
        renderer(Number(position.lat), Number(position.lng), location.color, location.name);
      }
    });
    renderMarkByPosition(locations, renderer, start);
  }, 20);
}

export const formatGeolocactionValue = (value) => {
  const location = value ? value : {};
  let district = location.district === 'other' ? '' : location.district;
  let city = location.city === 'other' ? '' : location.city;
  let province = location.province === 'other' ? '' : location.province;
  return `${province || ''}${city || ''}${district || ''}${value.detail || ''}`;
}

export const getInitialMapCenter = async (locations, geocoder) => {
  let position = [32, 166], zoom = 2;
  let center = localStorage.getItem('dtable-map-plugin-center');
  if (!center) {
    let location = locations[0] || {};
    if (location.type === 'text') {
      return await new Promise(resolve => {
        geocoder.geocode(
          { address: location.location },
          (points, status) => {
            if (status === window.google.maps.GeocoderStatus.OK) {
              let lat = points[0].geometry.location.lat();
              let lng = points[0].geometry.location.lng();
              position = [lat, lng];
            }
            resolve({ position, zoom });
          }
        );
      });
    } else {
      position = location.position || position;
      position = [position[1], position[0]];
    }
  } else {
    center = JSON.parse(center)
    position = [center.position.lat, center.position.lng];
    zoom = center.zoom;
  }
  return { position, zoom };
}