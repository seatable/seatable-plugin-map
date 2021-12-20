import intl from 'react-intl-universal';
export const IMAGE_PATH = '//cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/';

export const PLUGIN_NAME = 'map-en';

export const CONFIG_TYPE = {
  MAP_MODE: 'map_mode',
  TABLE: 'table',
  VIEW: 'view',
  COLUMN: 'column',
  MARK_DEPENDENCE: 'mark_dependence',
  DIECT_SHOWN_COLUMN: 'direct_shown_column',
  IMAGE_COLUMN: 'image_column'
};

export const GEOCODING_FORMAT = ['geolocation', 'country_region', 'province', 'province_city'];

export const COLUMN_TYPES = ['geolocation', 'text'];

export const KEY_SELECTED_VIEW_IDS = `${PLUGIN_NAME}-selectedViewIds`;

export const MAP_MODE = {
  DEFAULT: intl.get('Default_map'),
  IMAGE: intl.get('Image_map')
};
