
import { CellType } from 'dtable-utils';
import getPreviewContent from 'dtable-ui-component/lib/SimpleLongTextFormatter/normalize-long-text-value';


export const getDtableUuid = () => {
  if (window.dtable && window.dtable.dtableUuid) {
    return window.dtable.dtableUuid;
  }
  return window.dtablePluginConfig.dtableUuid;
};

export const getValueFromPluginConfig = (attribute) => {
  return window.dtable[attribute];
};

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
};

export const setSelectedViewIds = (key, index) => {
  let selectedViewIdsString = window.localStorage.getItem(key);
  const dtableUuid = getDtableUuid();
  let selectedViewIds = selectedViewIdsString ? JSON.parse(selectedViewIdsString) : {};
  selectedViewIds[dtableUuid] = index;
  localStorage.setItem(key, JSON.stringify(selectedViewIds));
};

export const getCanUseAdvancedPerms = () => {
  return window.dtable.canUseAdvancedPerms;
};

export const replaceSettingItem = (settings, settingItem, index) => {
  settings.splice(index, 1, settingItem);
  return settings;
};

export function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }
  if (typeof objA !== 'object' || !objA  || typeof objB !== 'object' || !objB) {
    return false;
  }
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (let i = 0; i < keysA.length; i++) {
    let key = keysA[i];
    let valueA = objA[key];
    let valueB = objB[key];
    if (key === 'layout') continue;
    if (Object.prototype.hasOwnProperty.call(objB, key)) {
      if (Array.isArray(valueA) && Array.isArray(valueB)) {
        let isArrayEqual = arraysEqual(valueA, valueB);
        if (!isArrayEqual) return false;
      } else if (valueA !== valueB) {
        return false;
      }
    } else {
      return false;
    }
  }

  return true;
}

function arraysEqual(arrayA, arrayB) {
  if (arrayA === null || arrayB === null) return false;
  if (arrayA.length !== arrayB.length) return false;
  for (let i = 0; i < arrayA.length; i++) {
    if (arrayA[i] !== arrayB[i]) return false;
  }
  return true;
}

export const getMedialURL = () => {
  return window.dtable.mediaUrl;
};

export const isValidCellValue = (value) => {
  if (value === undefined) return false;
  if (value === null) return false;
  if (value === '') return false;
  if (JSON.stringify(value) === '{}') return false;
  if (JSON.stringify(value) === '[]') return false;
  return true;
};

const getTwoDimensionArrayValue = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => {
      if (Object.prototype.toString.call(item) !== '[object Object]') {
        return item;
      }
      if (!Object.prototype.hasOwnProperty.call(item, 'display_value')) return item;
      const { display_value } = item;
      if (!Array.isArray(display_value) || display_value.length === 0) return display_value;
      return display_value.map(i => {
        if (Object.prototype.toString.call(i) === '[object Object]') {
          if (!Object.prototype.hasOwnProperty.call(i, 'display_value')) return i;
          const { display_value } = i;
          return display_value;
        }
        return i;
      });
    });
};

export const isValidEmail = (email) => {
  const reg = /^[A-Za-zd]+([-_.][A-Za-zd]+)*@([A-Za-zd]+[-.])+[A-Za-zd]{2,6}$/;

  return reg.test(email);
};

export const getFormulaArrayValue = (value, isFlat = true) => {
  if (!Array.isArray(value)) return [];
  if (!isFlat) return getTwoDimensionArrayValue(value);
  return value
    .map(item => {
      if (Object.prototype.toString.call(item) !== '[object Object]') {
        return item;
      }
      if (!Object.prototype.hasOwnProperty.call(item, 'display_value')) return item;
      const { display_value } = item;
      if (!Array.isArray(display_value) || display_value.length === 0) return display_value;
      return display_value.map(i => {
        if (Object.prototype.toString.call(i) === '[object Object]') {
          if (!Object.prototype.hasOwnProperty.call(i, 'display_value')) return i;
          const { display_value } = i;
          return display_value;
        }
        return i;
      });
    })
    .flat()
    .filter(item => isValidCellValue(item));
};


export const convertValueToDtableLongTextValue = (value) => {
  const valueType = Object.prototype.toString.call(value);
  if (value && valueType === '[object String]') {
    return getPreviewContent(value);
  }
  if (valueType === '[object Object]') {
    return value;
  }
  return '';
};

export const isArrayFormalColumn = (columnType) => {
  return [
    CellType.IMAGE,
    CellType.FILE,
    CellType.MULTIPLE_SELECT,
    CellType.COLLABORATOR
  ].includes(columnType);
};

