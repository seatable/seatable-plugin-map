import intl from 'react-intl-universal';


const SETTING_MIRROR = {
  table: 'tableName',
  view: 'viewName',
  column: 'columnName',
  mark_dependence: 'markDependence',
  direct_shown_column: 'directShownColumnName',
  name: 'name',
  id: 'id',
  map_mode: 'mapMode',
  image_column: 'imageColumnName'
}

export const generateSettingsByConfig = (configSettings, currentSettingItem) => {
  const settings = {};
  configSettings.forEach((config) => {
    let value = config.active;
    if (value === intl.get('Not_used')) {
      value = null;
    }

    if (config.type === 'mark_dependence') {
      if (value === intl.get('Row_color')) {
        value = 'rows_color';
      }
    }
    settings[SETTING_MIRROR[config.type]] = value;
  });
  settings.id = currentSettingItem.id;
  settings.name = currentSettingItem.name;
  return settings;
}