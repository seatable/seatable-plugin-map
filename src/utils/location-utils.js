import getConfigItemByType from './get-config-item-by-type';
import intl from 'react-intl-universal';

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
  const markDependence = getConfigItemByType(configSettings, 'mark_dependence').active;
  const currentMarkColumn = dtable.getColumnByName(currentTable, markDependence);
  const isRowColor = markDependence === intl.get('Row_color');
  let rowsColor = {};
  if (isRowColor) {
    const viewRows = dtable.getViewRows(currentView, currentTable);
    rowsColor = dtable.getViewRowsColor(viewRows, currentView, currentTable);
  }
  const directShownColumnName = getConfigItemByType(configSettings, 'direct_shown_column').active;
  const directShownColumn = dtable.getColumnByName(currentTable, directShownColumnName);
  let directShownLabel = '';
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
    let color = '';
    if (isRowColor) {
      color = getRowColor(rowsColor, row);
    } else if (currentMarkColumn) {
      color = getMarkColor(currentMarkColumn, row) || color;
    }
    if (directShownColumn) {
      directShownLabel = getDirectShownLabel(row, directShownColumn);
    }
    const value = row[locationValueKey] || {};
    locations.push({
      type: addressType,
      location: value,
      name: row[locationNameKey] || '',
      color,
      columnName,
      directShownLabel
    });
  });
  return locations;
}

function getDirectShownLabel(row, column) {
  let label = '';
  let value = row[column.key];
  if (column.type === 'text') {
    if (!row[column.key]) {
      return;
    }
    label = `<p class='map-en-direct-shown-label-container'>${row[column.key]}</p>`;
  } else if (column.type === 'single-select') {
    const item = column.data.options.find((item) => {
      return item.id === value;
    });
    if (item) {
      label = `<p class='map-en-direct-shown-label-container'><span style='background-color: ${item.color}; color: ${item.textColor}' class='single-select-formatter'>${item.name}</span></p>`;
    }
  }
  return label;
} 

export const renderMarkByPosition = (locations, renderer, start = 0) => {
  let stack = locations.slice(start, start += 10);
  if (stack.length === 0) return;

  setTimeout(() => {
    stack.forEach((location) => {
      const position = location.location;
      if (Number(position.lng) && Number(position.lat)) {
        renderer(location, Number(position.lat), Number(position.lng));
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

const getRowColor = (rowsColors, row) => {
  return rowsColors[row._id] || '';
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