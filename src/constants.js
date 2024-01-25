import intl from 'react-intl-universal';

import { CellType } from 'dtable-utils';
export const IMAGE_PATH = '//cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/';

export const UNKNOWN_TYPE = 'unknown';

export const IS_MOBILE = (typeof (window) !== 'undefined') && (window.innerWidth < 768 || navigator.userAgent.toLowerCase().match(/(ipod|ipad|iphone|android|coolpad|mmp|smartphone|midp|wap|xoom|symbian|j2me|blackberry|wince)/i) != null);

export const EVENT_BUS_TYPE = {
  CLOSE_LOCATION_DETAILS: 'close_location_details',
  SHOW_LOCATION_DETAILS: 'show_location_details',
};

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

export const ADDRESS_REG = /.+?(省|市|自治区|自治州|县|区|镇|乡|村)/g;


export const EMPTY_MARK_DEPENDENCE = '不使用';
export const GEOLOCATION_COLUMN_NAME = '请选择';
export const EMPTY_NUMERIC_COLUMN_NAME = '不使用数值列';
export const EMPTY_IMAGE_COLUMN = '不使用图片列';
export const DEPENDENT_ROW_COLOR = '';

export const SHOWN_COLUMN_TYPES = [
  CellType.NUMBER,
  CellType.TEXT,
  CellType.DATE,
  CellType.SINGLE_SELECT,
  CellType.COLLABORATOR,
  CellType.FORMULA,
  CellType.LINK_FORMULA,
];


export const SETTING_TITLE = {
  SHOW_USER_LOCATION: '显示用户当前位置',
  MAP_MODE: '图表类型',
  TABLE: '子表',
  VIEW: '视图',
  GEO_COLUMN: '地址信息字段',
  COLOR_COLUMN: '标签颜色来自',
  NUMERIC_COLUMN: '数值字段',
  BUBBLE_SIZE: '气泡大小',
  DIECT_SHOWN_COLUMN: '直接显示字段',
  HOVER_DISPLAY_COLUMNS: '鼠标悬浮时显示字段',
  IMAGE_COLUMN: '图片'
};

export const DEFAULT_MARK_COLOR = { BG_COLOR: 'rgba(219, 65, 57, .6)', BORDER_COLOR: '#c43638' };
export const COLORS = [
  { COLOR: '#FFFCB5', BORDER_COLOR: '#E8E79D', RGB_COLOR: 'rgba(255, 252 , 181, .6)' },
  { COLOR: '#FFEAB6', BORDER_COLOR: '#ECD084', RGB_COLOR: 'rgba(255, 234, 182, .6)' },
  { COLOR: '#FFD9C8', BORDER_COLOR: '#EFBAA3', RGB_COLOR: 'rgba(255, 217, 200, .6)' },
  { COLOR: '#FFDDE5', BORDER_COLOR: '#EDC4C1', RGB_COLOR: 'rgba(255, 221, 229, .6)' },
  { COLOR: '#FFD4FF', BORDER_COLOR: '#E6B6E6', RGB_COLOR: 'rgba(255, 212, 255, .6)' },
  { COLOR: '#DAD7FF', BORDER_COLOR: '#C3BEEF', RGB_COLOR: 'rgba(255, 212, 255, .6)' },
  { COLOR: '#DDFFE6', BORDER_COLOR: '#BBEBCD', RGB_COLOR: 'rgba(221, 255, 230, .6)' },
  { COLOR: '#DEF7C4', BORDER_COLOR: '#C5EB9E', RGB_COLOR: 'rgba(222, 247, 196, .6)' },
  { COLOR: '#D8FAFF', BORDER_COLOR: '#B4E4E9', RGB_COLOR: 'rgba(216, 250, 255, .6)' },
  { COLOR: '#D7E8FF', BORDER_COLOR: '#BAD1E9', RGB_COLOR: 'rgba(215, 232, 255, .6)' },
  { COLOR: '#B7CEF9', BORDER_COLOR: '#96B2E1', RGB_COLOR: 'rgba(183, 206, 249, .6)' },
  { COLOR: '#E9E9E9', BORDER_COLOR: '#DADADA', RGB_COLOR: 'rgba(233, 233, 233, .6)' },
  { COLOR: '#FBD44A', BORDER_COLOR: '#E5C142', RGB_COLOR: 'rgba(251, 212, 74, .6)' },
  { COLOR: '#EAA775', BORDER_COLOR: '#D59361', RGB_COLOR: 'rgba(234, 167, 117, .6)' },
  { COLOR: '#F4667C', BORDER_COLOR: '#DC556A', RGB_COLOR: 'rgba(244, 102, 124, .6)' },
  { COLOR: '#DC82D2', BORDER_COLOR: '#D166C5', RGB_COLOR: 'rgba(220, 130, 210, .6)' },
  { COLOR: '#9860E5', BORDER_COLOR: '#844BD2', RGB_COLOR: 'rgba(152, 96, 229, .6)' },
  { COLOR: '#9F8CF1', BORDER_COLOR: '#8F75E2', RGB_COLOR: 'rgba(159, 140, 241, .6)' },
  { COLOR: '#59CB74', BORDER_COLOR: '#4EB867', RGB_COLOR: 'rgba(89, 203, 116, .6)' },
  { COLOR: '#ADDF84', BORDER_COLOR: '#9CCF72', RGB_COLOR: 'rgba(173, 223, 132, .6)' },
  { COLOR: '#89D2EA', BORDER_COLOR: '#7BC0D6', RGB_COLOR: 'rgba(137, 210, 234, .6)' },
  { COLOR: '#4ECCCB', BORDER_COLOR: '#45BAB9', RGB_COLOR: 'rgba(78, 204, 203, .6)' },
  { COLOR: '#46A1FD', BORDER_COLOR: '#3C8FE4', RGB_COLOR: 'rgba(70, 161, 253, .6)' },
  { COLOR: '#C2C2C2', BORDER_COLOR: '#ADADAD', RGB_COLOR: 'rgba(194, 194, 194, .6)' },
];

export const PROVINCIAL_CAPITAL = {
  '安徽省': '合肥市',
  '澳门': '澳门',
  '北京市': '北京市',
  '重庆市': '重庆市',
  '福建省': '福州市',
  '甘肃省': '兰州市',
  '广东省': '广州市',
  '广西壮族自治区': '南宁市',
  '河北省': '石家庄市',
  '黑龙江省': '哈尔滨市',
  '河南省': '郑州市',
  '湖北省': '武汉市',
  '湖南省': '长沙市',
  '江苏省': '南京市',
  '江西省': '南昌市',
  '吉林省': '长春市',
  '辽宁省': '沈阳市',
  '内蒙古自治区': '呼和浩特市',
  '宁夏回族自治区': '银川市',
  '青海省': '西宁市',
  '山东省': '济南市',
  '上海市': '上海市',
  '山西省': '太原市',
  '陕西省': '西安市',
  '四川省': '成都市',
  '台湾省': '台北市',
  '天津市': '天津市',
  '香港': '香港',
  '西藏自治区': '拉萨市',
  '新疆维吾尔自治区': '乌鲁木齐市',
  '云南省': '昆明市',
  '浙江省': '杭州市',
  '海南省': '海口市',
  '贵州省': '贵阳市'
};


