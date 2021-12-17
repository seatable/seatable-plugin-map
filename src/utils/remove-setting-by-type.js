const removeSettingByType = (configSettings, settingTypes) => {
  if (Array.isArray(settingTypes)) {
    return configSettings.filter((setting) => {
      return !settingTypes.includes(setting.type);
    });
  } else {
    return configSettings.filter((setting) => {
      return setting.type !== settingTypes;
    });
  }
}

export default removeSettingByType;