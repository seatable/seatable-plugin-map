import intl from 'react-intl-universal';
import { getTableByName, getViewByName, getTableColumnByName, CellType, FORMULA_COLUMN_TYPES_MAP, isDefaultView, isNumber, } from 'dtable-utils';
import { FormulaFormatter } from 'dtable-ui-component';
import getConfigItemByType from './get-config-item-by-type';
import { MAP_MODE, DEFAULT_MARK_COLOR, ADDRESS_REG, PROVINCIAL_CAPITAL, GEOCODING_FORMAT } from '../constants';
import ReactDOMServer from 'react-dom/server';
import { getCanUseAdvancedPerms } from './common-utils';
import dtableWebProxyAPI from '../api/dtable-web-proxy-api';

export const getLocations = (tables, configSettings, { collaborators }) => {
  let locations = [];
  const mapType = getConfigItemByType(configSettings, 'map_mode').active;
  const tableName = getConfigItemByType(configSettings, 'table').active;
  const viewName = getConfigItemByType(configSettings, 'view').active;
  const columnName = getConfigItemByType(configSettings, 'column').active;
  const shownColumns = getConfigItemByType(configSettings, 'hover_display_columns').settings;
  let currentTable = getTableByName(tables, tableName);
  let currentView = getViewByName(currentTable.views, viewName);
  let currentColumn = getTableColumnByName(currentTable, columnName);
  if (!currentColumn) {
    return [];
  }
  let imageColumnSetting = getConfigItemByType(configSettings, 'image_column');
  const imageColumnName = imageColumnSetting ? imageColumnSetting.active : '';
  const directShownColumnName = getConfigItemByType(configSettings, 'direct_shown_column').active;
  const directShownColumn = getTableColumnByName(currentTable, directShownColumnName);
  let numericColumn = null;
  let locationNameKey = currentTable.columns[0].key;

  let rows = currentTable.rows;
  if (!isDefaultView(currentView, currentTable.columns)) {
    rows = window.dtableSDK.getViewRows(currentView, currentTable);
  }

  if (rows.length === 0) return [];
  const formulaRows = window.dtableSDK.getTableFormulaResults(currentTable, rows);
  const columnData = currentColumn.data || {};
  let locationValueKey = currentColumn.key;
  let addressType = columnData.geo_format || 'geolocation';
  let total = 0, bubbleSize = 1, formulaResult = null;
  if (mapType === MAP_MODE.BUBBLE) {
    let numericColumnName = getConfigItemByType(configSettings, 'numeric_column').active;
    numericColumn = getTableColumnByName(currentTable, numericColumnName);
    bubbleSize = getConfigItemByType(configSettings, 'bubble_size').value;
    if (numericColumn && numericColumn.type === 'formula') {
      formulaResult = window.dtableSDK.getTableFormulaResults(currentTable, rows);
    }
    if (numericColumn) {
      total = rows.reduce((total, row) => {
        const cellValue = numericColumn.type === 'formula' ? formulaResult[row._id][numericColumn.key] : row[numericColumn.key];
        if (typeof cellValue === 'number') {
          return total + Math.abs(cellValue);
        } else {
          return total;
        }
      }, 0);
    }
  }
  const markDependence = getConfigItemByType(configSettings, 'mark_dependence').active;
  const currentMarkColumn = getTableColumnByName(currentTable, markDependence);
  const isRowColor = markDependence === intl.get('Row_color');
  let rowsColor = {};
  if (isRowColor) {
    const viewRows = window.dtableSDK.getViewRows(currentView, currentTable);
    rowsColor = window.dtableSDK.getViewRowsColor(viewRows, currentView, currentTable);
  }
  rows.forEach(row => {
    const labels = getLabel(tables, configSettings, row, shownColumns, formulaRows, collaborators);
    let color = DEFAULT_MARK_COLOR['BG_COLOR'];
    let directShownLabel = '';
    if (isRowColor) {
      color = getRowColor(rowsColor, row);
    } else if (currentMarkColumn) {
      color = getMarkColorByColumn(currentMarkColumn, row) || color;
    }
    if (directShownColumn) {
      directShownLabel = getDirectShownLabel(row, directShownColumn);
    }
    let rate = 0;
    if (mapType === MAP_MODE.BUBBLE) {
      let numericValue = 0;
      if (numericColumn) {
        numericValue = (numericColumn.type === 'formula' ? formulaResult[row._id][numericColumn.key] : row[numericColumn.key]) || 0;
      }
      rate = isNaN(parseFloat(Math.abs(numericValue) / total, 2)) ? 0 : parseFloat(numericValue / total, 2);
    }
    const value = row[locationValueKey];

    if (value && Object.keys(value).length > 0) {
      locations.push({
        type: addressType,
        location: value,
        name: row[locationNameKey] || '',
        color,
        labels,
        columnName,
        rate,
        bubbleSize,
        directShownLabel,
        rowId: row._id,
        imageColumnName,
        mapMode: mapType
      });
    }
  });
  return locations;
};

export const getRequiredCodingLocations = (locations) => {
  if (!Array.isArray(locations)) return [];
  return locations.filter((location) => {
    const addressType = location && location.type;
    return addressType && GEOCODING_FORMAT.includes(addressType);
  });
};

export const checkIsOverFreeCodingLocations = (locations) => {
  if (getCanUseAdvancedPerms()) return false;
  return locations.length > 100;
};

export const checkIsOverMaxCodingLocations = (locations) => {
  return locations.length > 5000;
};

const getMarkColorByColumn = (markColumn, row) => {
  const key = markColumn.key;
  if (!markColumn.data) return '';
  const options = markColumn.data.options;
  if (!options) return '';

  const currentOption = options.find((option) => {
    return option.id === row[key];
  });
  if (!currentOption) return '';
  return currentOption.color;
};

const getLabel = (tables, configSettings, row, shownColumns, formulaRows, collaborators) => {
  const currentTable = getTableByName(tables, configSettings[1].active);
  const labels = [];
  shownColumns.forEach((columnItem) => {
    if (columnItem.active) {
      const column = getTableColumnByName(currentTable, columnItem.columnName);
      if (!column) return;
      let value = row[column.key];
      const type = column.type;
      if (type === CellType.NUMBER && typeof value === 'number') {
        labels.push(String(value));
        return;
      }
      if (FORMULA_COLUMN_TYPES_MAP[type]) {
        let formulaValue = formulaRows[row._id] ? formulaRows[row._id][column.key] : '';
        if (formulaValue) {
          let formulaFormatter = <FormulaFormatter value={formulaValue} column={column} collaborators={collaborators} />;
          const newFormulaValue = ReactDOMServer.renderToStaticMarkup(formulaFormatter);
          labels.push(newFormulaValue);

        } else {
          labels.push(null);
        }
        return;
      }
      if (!value) {
        labels.push(null);
        return;
      }
      if (type === CellType.TEXT || type === CellType.DATE) {
        if (value) {
          labels.push(value);
        }
      } else if (type === CellType.SINGLE_SELECT) {
        const item = column.data.options.find((item) => {
          return item.id === value;
        });
        if (item) {
          labels.push(`<span style='background-color: ${item.color}; color: ${item.textColor}' class='map-single-select-formatter'>${item.name}</span>`);
        }
      } else if (type === CellType.COLLABORATOR) {
        let collaboratorsName = '';
        value.forEach((email) => {
          const collaborator = collaborators.find((collaborator) => {
            return collaborator.email === email;
          });
          if (collaborator && collaborator.name) {
            collaboratorsName += collaborator.name + ' ';
          }
        });
        labels.push(collaboratorsName);
      }
    }
  });
  return labels;
};

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

export const renderMarkByPosition = (locations, renderer, start = 0, configSettings) => {
  let stack = locations.slice(start, start += 10);
  if (stack.length === 0) return;
  setTimeout(() => {
    stack.forEach((location) => {
      const position = location.location;
      if (Number(position.lng) && Number(position.lat)) {
        renderer(location, Number(position.lat), Number(position.lng), null, configSettings);
      }
    });
    renderMarkByPosition(locations, renderer, start, configSettings);
  }, 20);
};

export const formatGeolocationValue = (value, type) => {
  const location = value ? value : {};
  if (type === 'country_region') {
    return `${value.country_region || ''}`;
  }
  let district = location.district === 'other' ? '' : location.district;
  let city = location.city === 'other' ? '' : location.city;
  let province = location.province === 'other' ? '' : location.province;

  if (type === 'province_city') {
    return `${province || ''}${city || ''}`;
  }

  if (type === province) {
    return `${province || ''}`;
  }

  return `${province || ''}${city || ''}${district || ''}${value.detail || ''}`;
};

const getRowColor = (rowsColors, row) => {
  return rowsColors[row._id] || '';
};

export const getInitialMapCenter = async (locations) => {
  let position = [32, 166];
  let zoom = 2;
  let center = localStorage.getItem('dtable-map-plugin-center');
  if (!center) {
    const location = locations[0] || {};
    const address = location.location;
    if (location.type === 'text' && typeof address === 'string' && address) {
      return await new Promise(resolve => {
        dtableWebProxyAPI.addressConvert([address]).then((res) => {
          const { result } = (res && res.data) || {};
          if (Array.isArray(result) && result.length > 0) {
            const { lat, lng } = result[0] || {};
            if (isNumber(lat) && isNumber(lng)) {
              position = [lat, lng];
            }
            resolve({ position, zoom });
          }
        });
      });
    } else {
      position = location.position || position;
      position = [position[1], position[0]];
    }
  } else {
    center = JSON.parse(center);
    position = [center.position.lat, center.position.lng];
    zoom = center.zoom;
  }
  return { position, zoom };
};

export const getFormattedLocation = (location) => {
  const detailLocation = getDetailLocation(location);
  const simpleLocation = getSimpleLocation(location);
  const cityLocation = getCityLocation(location);
  return { cityLocation, simpleLocation, detailLocation };
};

export const getDetailLocation = (locationItem) => {
  // location is a string
  const location = locationItem.location;
  if (!location) return '';
  if (typeof location === 'string') {
    if (!location || !location.match(ADDRESS_REG)) {
      return;
    }
    return location;
  }

  // location is an object
  const { province, city, district, detail } = location || {};
  const newProvince = (province && province !== intl.get('others')) ? province : '';
  const newCity = (city && city !== intl.get('others')) ? city : '';
  const newDistrict = (district && district !== intl.get('others')) ? district : '';
  const newDetail = detail ? detail : '';

  return `${newProvince}${newCity}${newDistrict}${newDetail}`;
};

export const getSimpleLocation = (locationItem) => {
  const location = locationItem.location;
  if (!location) return '';
  if (typeof location === 'string') {
    return location || '';
  }

  const { district, detail } = location || {};
  const newDistrict = (district && district !== intl.get('others')) ? district : '';
  const newDetail = detail ? detail : '';

  return `${newDistrict}${newDetail}`;
};

export const getCityLocation = (locationItem) => {
  const location = locationItem.location;
  if (!location) return '';
  if (typeof location === 'string') {
    const index = location.indexOf('市');
    if (index > 0) {
      return location.slice(0, index + 1);
    } else {
      return location;
    }
  }
  const { city, province } = location || {};
  let newCity = '';
  if (locationItem.type === 'province') {
    newCity = PROVINCIAL_CAPITAL[province] || '';
  } else {
    newCity = (city && city !== intl.get('others')) ? city : '';
  }
  return newCity;
};

// TODO
export const generateLabelContent = (location) => {
  const labels = location.labels;
  const labelHtml = labels.reduce((content, label) => {
    const labelContent = label ? `<div style="margin: 10px 0">${label}</div>` : '<p><span class=\'row-cell-empty\'></span></p>';
    return content + labelContent;
  }, '');

  if (location.type === 'lng_lat') {
    if (labelHtml) {
      return (`
        ${labelHtml}
        <i class='plugin-label-arrow dtable-font dtable-icon-drop-down'></i>
      `);
    } else {
      return '<p><span class=\'row-cell-empty\'></span></p> <i class=\'plugin-label-arrow dtable-font dtable-icon-drop-down\'></i>';
    }
  } else {
    const { detailLocation } = getFormattedLocation(location);
    return (`
      <p>${detailLocation}</p>
      ${labelHtml}
      <i class='plugin-label-arrow dtable-font dtable-icon-drop-down'></i>
    `);
  }
};
