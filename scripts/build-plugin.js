const JSZip = require("jszip");
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const paths = require('../config/paths');

const moduleFileExtensions = ['js', 'css'];

const config = {
  dir: paths.appBuild + '/static/'
}

const zip = new JSZip();

const jsFilePath = getFullFileName(config.dir + 'js');
const jsonFilePath = path.join(paths.pluginConfigPath, 'info.json');

zip.folder('task').file('main.js', getFileContent(jsFilePath));
zip.folder('task/media')

let imgFilePath, cardImagePath, cssFilePath;
if (isPluginConfigFile(paths.pluginConfigPath, 'icon.png')) {
  imgFilePath = path.join(paths.pluginConfigPath, 'icon.png'); 
  zip.file('task/media/icon.png', fs.readFileSync(imgFilePath));
}

if (isPluginConfigFile(paths.pluginConfigPath, 'crad-image.png')) {
  cardImagePath = path.join(paths.pluginConfigPath, 'crad-image.png'); 
  zip.file('task/media/crad-image.png', fs.readFileSync(cardImagePath));
}

if (getFullFileName(config.dir + 'css')) {
  cssFilePath = getFullFileName(config.dir + 'css');
  zip.file('task/media/main.css', getFileContent(cssFilePath));
}

const pluginConfigJson = {
  "last_modified": moment().format(),
  "has_icon": isPluginConfigFile(paths.pluginConfigPath, 'icon.png'),
  "has_css": getFullFileName(config.dir + 'css') ? true : false,
  "has_card_image": isPluginConfigFile(paths.pluginConfigPath, 'crad-image.png')
}

const pluginInfoContent = JSON.parse(getFileContent(jsonFilePath));
let jsonFileContent = Object.assign({}, pluginInfoContent, pluginConfigJson);

zip.file('task/info.json', JSON.stringify(jsonFileContent, null, '  '));

zip.generateAsync({type:"nodebuffer"}).then(function(content) { 
  const zip = `${pluginInfoContent.name}-${pluginInfoContent.version}.zip`;
  fs.writeFile(paths.zipPath + '/' + zip, content, function(err) {
    if (err) {
      console.log(zip + ' failed');
      console.log(err)
      return;
    }
    console.log(zip + ' successful');
  })
});

function isPluginConfigFile(overallPath, fileName) {
  return fs.readdirSync(overallPath).includes(fileName);
}

/**
 * Get the full file path
 * @param  {string} overallPath File parent path 
 */
function getFullFileName(overallPath) {
  const fileName = fs.readdirSync(overallPath).find(fileItem => {
    let extension = fileItem.substring(fileItem.lastIndexOf('.') + 1);
    if (moduleFileExtensions.includes(extension)) {
      return fileItem
    }
  });
  if (!fileName) {
    return false;
  }
  return path.join(overallPath, fileName);
}

/**
 * Get file content
 * @param  {string} overallPath full file path
 */
function getFileContent (overallPath) {
　　// Specifying encoding returns a string, otherwise returns a Buffer
  let content = fs.readFileSync(overallPath, { encoding: "utf-8" });
  return content;
}