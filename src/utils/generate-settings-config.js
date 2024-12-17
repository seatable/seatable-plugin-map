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
    const { type } = config;
    if (type === 'hover_display_columns') {
      settings[SETTING_MIRROR[type]] = config.settings;
    } else if (type === 'bubble_size') {
      settings[SETTING_MIRROR[type]] = config.value;
    } else if (type === 'mark_dependence') {
      let value = config.active;
      if (config.active === intl.get('Row_color')) {
        value = 'rows_color';
      }
      settings[SETTING_MIRROR[type]] = value;
    } else if (type === 'image_column') {
      settings[SETTING_MIRROR[type]] = config.active;
    } else if (type === 'show_user_location') {
      return;
    } else {
      settings[SETTING_MIRROR[type]] = config.active;
    }
  });
  settings.id = currentSettingItem.id;
  settings.name = currentSettingItem.name;
  return settings;
};
