const getConfigItemByType = (configSettings, type) => {
  return configSettings.find((item) => {
    return item.type === type;
  });
};

export default getConfigItemByType;
