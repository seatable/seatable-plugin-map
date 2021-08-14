export const generatorViewId = (views = []) => {
  let view_id, isUnique = false;
  while (!isUnique) {
    view_id = generatorBase64Code(4);

    // eslint-disable-next-line
    isUnique = views.every(item => {return item._id !== view_id;});
    if (isUnique) {
      break;
    }
  }
  return view_id;
};

export const generatorBase64Code = (keyLength = 4) => {
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < keyLength; i++) {
    key += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return key;
};

export const getSelectedViewIds = (key) => {
  let selectedViewIdsString = window.localStorage.getItem(key);
  const dtableUuid = getDtableUuid();
  let selectedViewIds = selectedViewIdsString ? JSON.parse(selectedViewIdsString) : {};
  return selectedViewIds[dtableUuid];
}

export const setSelectedViewIds = (key, index) => {
  let selectedViewIdsString = window.localStorage.getItem(key);
  const dtableUuid = getDtableUuid();
  let selectedViewIds = selectedViewIdsString ? JSON.parse(selectedViewIdsString) : {};
  selectedViewIds[dtableUuid] = index;
  localStorage.setItem(key, JSON.stringify(selectedViewIds));
}

export const getDtableUuid = () => {
  if (window.dtable && window.dtable.dtableUuid) {
    return window.dtable.dtableUuid;
  }
  return window.dtablePluginConfig.dtableUuid;
};

export const replaceSettingItem = (settings, settingItem, index) => {
  settings.splice(index, 1, settingItem);
  return settings;
}
