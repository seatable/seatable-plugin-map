import intl from 'react-intl-universal';


const SETTING_MIRROR = {
  map_mode: 'mapMode',
  show_user_location: 'showUserLocation',
  table: 'tableName',
  view: 'viewName',
  column: 'columnName',
  mark_dependence: 'markDependence',
  image_column: 'imageColumnName',
  hover_display_columns: 'shownColumns',
  bubble_size: 'bubbleSize',
  numeric_column: 'numericColumnName',
  direct_shown_column: 'directShownColumnName',
  id: 'id',
  name: 'name'
};


export const generateSettingsByConfig = (configSettings, currentSettingItem) => {
  const settings = {};
  configSettings.forEach((config) => {
    if (config.type === 'hover_display_columns') {
      settings[SETTING_MIRROR[config.type]] = config.settings;
    } else if (config.type === 'bubble_size') {
      settings[SETTING_MIRROR[config.type]] = config.value;
    } else if (config.type === 'mark_dependence') {
      let value = config.active;
      if (config.active === intl.get('Not_used')) {
        value = null;
      } else if (config.active === intl.get('Row_color')) {
        value = 'rows_color';
      }
      settings[SETTING_MIRROR[config.type]] = value;
    } else if (config.type === 'image_column') {
      settings[SETTING_MIRROR[config.type]] = config.active;
    } else if (config.type === 'show_user_location') {
      // set showUserLocation as active (value is true or false)
      settings[config.type] = config.active;
    }  else {
      let value = config.active;
      if (value === intl.get('Not_used')){
        value = null;
      }
      settings[SETTING_MIRROR[config.type]] = value;
    }
  });
  settings.id = currentSettingItem.id;
  settings.name = currentSettingItem.name;
  return settings;
};
