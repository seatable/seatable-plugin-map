const SETTING_MIRROR = {
  table: 'tableName',
  view: 'viewName',
  column: 'columnName',
  mark_column: 'markColumnName',
}

export const generateSettingsByConfig = (configSettings) => {
  const settings = {};
  configSettings.forEach((config) => {
    settings[SETTING_MIRROR[config.type]] = config.active;
  });

  return settings;
}