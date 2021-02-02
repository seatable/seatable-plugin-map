export const replaceSettingItemByType = (configSettings, type, settingItems) => {
  const index = configSettings.findIndex((item) => item.type === type);
  if (Array.isArray(settingItems)) {
    configSettings.splice(index, settingItems.length, ...settingItems);
  } else {
    configSettings.splice(index, 1, settingItems);
  }
  return configSettings;
}