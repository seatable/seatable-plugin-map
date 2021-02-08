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
  const addressType = getConfigItemByType(configSettings, 'address_type').active;
  let currentTable = dtable.getTableByName(tableName);
  let currentView = dtable.getViewByName(currentTable, viewName);
  const markColumnName = getConfigItemByType(configSettings, 'mark_column').active;
  const currentMarkColumn = dtable.getColumnByName(currentTable, markColumnName);
  let locationNameKey = currentTable.columns[0].key;
  let rows = currentTable.rows;

  if (currentView.rows.length > 0) {
    // get view's rows and filtered null object
    rows = currentView.rows.map(rowId => currentTable['id_row_map'][rowId]).filter(Boolean);
  }

  if (rows.length === 0) return [];


  if (addressType === 'text') {
    const columnName = getConfigItemByType(configSettings, 'column').active;
    let currentColumn = dtable.getColumnByName(currentTable, columnName);
    // current view has none column
    if (!currentColumn) {
      return [];
    }

    let locationValueKey = currentColumn.key;
    let locationColumnType = currentColumn.type;

    rows.forEach(row => {
      const color = currentMarkColumn ? getMarkColor(currentMarkColumn, row) : '';
      locations.push({
        type: locationColumnType,
        location: row[locationValueKey] || '',
        name: row[locationNameKey] || '',
        color,
        columnName,
      });
    });
  } else {
    const lngColumnName = getConfigItemByType(configSettings, 'lng_column').active;
    let lngColumn = dtable.getColumnByName(currentTable, lngColumnName);
    const latColumnName = getConfigItemByType(configSettings, 'lat_column').active;
    let latColumn = dtable.getColumnByName(currentTable, latColumnName);
    
    if (!latColumn || !lngColumn) return [];

    rows.forEach(row => {
      const color = currentMarkColumn ? getMarkColor(currentMarkColumn, row) : '';
      locations.push({
        position: [row[lngColumn.key], row[latColumn.key]],
        name: row[locationNameKey] || '',
        color,
      });
    });
  }

  return locations;
}

export const renderMarkByPosition = (locations, renderer, start = 0) => {
  let stack = locations.slice(start, start += 10);

  setTimeout(() => {
    stack.forEach((location) => {
      const position = location.position;
      if (Number(position[0]) && Number(position[1])) {
        renderer(position[1], position[0], location.color, location.name);
      }
    });
    renderMarkByPosition(locations, renderer, start += 10);
  }, 20);
}

export const formatGeolocactionValue = (value) => {
  const location = value.location ? value.location : {};
  let district = location.district === 'other' ? '' : location.district;
  let city = location.city === 'other' ? '' : location.city;
  let province = location.province === 'other' ? '' : location.province;
  return `${province || ''}${city || ''}${district || ''}${value.detail || ''}`;
}