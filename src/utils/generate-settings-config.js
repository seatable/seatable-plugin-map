import intl from 'react-intl-universal';


const SETTING_MIRROR = {
  table: 'tableName',
  view: 'viewName',
  column: 'columnName',
  mark_column: 'markColumnName',
  address_type: 'addressType',
  lng_column: 'lngColumnName',
  lat_column: 'latColumnName',
}

export const generateSettingsByConfig = (configSettings) => {
  const settings = {};
  configSettings.forEach((config) => {
    let value = config.active;
    if (value === intl.get('Not_used')) {
      value = null;
    }
    settings[SETTING_MIRROR[config.type]] = value;
  });
  return settings;
}